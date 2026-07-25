import { trace, context } from '@opentelemetry/api'
import pino, { type Logger } from 'pino'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { getObservabilityConfig } from './observabilityConfig'

const config = getObservabilityConfig()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const pinoMixin = (): Record<string, string> => {
  const activeContext = context.active()
  const spanContext = trace.getSpanContext(activeContext)
  if (spanContext) {
    return {
      trace_id: spanContext.traceId,
      span_id: spanContext.spanId,
    }
  }
  return {}
}

/**
 * Candidate directories where the .cjs pino transports may live at runtime.
 *
 * Order matters — first existing match wins. We probe several locations because
 * Next.js bundles `import.meta.url` to the BUILD-machine source path (e.g.
 * `/workspace/src/events/tracing/logger.ts`), so `__dirname` is unreliable in
 * production containers. The runtime path is normally `/app/src/events/tracing`
 * (Docker WORKDIR), and locally it's `<project>/src/events/tracing`.
 */
function resolveTransportDir(): string | null {
  const candidates = [
    process.env.PINO_TRANSPORT_DIR,
    resolve(process.cwd(), 'src/events/tracing'),
    resolve(process.cwd(), 'node_modules/.cache/transport-stub'),
    __dirname,
  ].filter((p): p is string => typeof p === 'string' && p.length > 0)

  for (const dir of candidates) {
    if (existsSync(join(dir, 'pinoOtlpTransport.cjs'))) {
      return dir
    }
  }
  return null
}

/**
 * Builds the pino transport configuration.
 *
 * Strategy:
 *  - In production (mode === 'prod') we deliberately do NOT use pino's worker
 *    transports. They spawn a worker_thread that requires the `.cjs` file via
 *    `real-require`; if the file is missing (very common in Next.js standalone
 *    builds where the source tree is stripped) the worker crashes with
 *    "the worker has exited" and the error floods the logs as uncaughtException.
 *  - Instead, pino writes JSON directly to stdout; a sidecar (Fluent Bit, Vector,
 *    otel-collector filelog receiver, etc.) ships the logs to Loki / OTel.
 *  - The transports are still wired up for development (pretty) and for an
 *    opt-in production flag (`PINOTS_USE_OTLP=1`) so the OTLP path can be
 *    tested without the sidecar.
 */
function resolveTransportTargets(): pino.TransportTargetOptions[] {
  const targets: pino.TransportTargetOptions[] = []

  const useOtlpInProd =
    config.mode === 'prod' && process.env.PINOTS_USE_OTLP === '1'

  if (config.logging.otlpPush && config.logging.otlpEndpoint && useOtlpInProd) {
    const dir = resolveTransportDir()
    const otlpPath = dir ? join(dir, 'pinoOtlpTransport.cjs') : null
    if (otlpPath && existsSync(otlpPath)) {
      targets.push({
        target: otlpPath,
        options: { endpoint: config.logging.otlpEndpoint },
      })
    } else {
      console.warn(
        `[logger] OTLP log transport requested but pinoOtlpTransport.cjs not found. ` +
          'Falling back to stdout JSON. Set PINOTS_USE_OTLP=1 and ensure the .cjs ' +
          'is reachable, or rely on a sidecar collector for log shipping.',
      )
    }
  }

  if (config.logging.format === 'pretty') {
    const dir = resolveTransportDir() ?? __dirname
    const prettyPath = join(dir, 'pinoPrettyTransport.cjs')
    if (existsSync(prettyPath)) {
      targets.push({
        target: prettyPath,
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' },
      })
    } else {
      console.warn(
        `[logger] pinoPrettyTransport.cjs not found at ${prettyPath} — falling back to JSON stdout.`,
      )
    }
  }

  return targets
}

function attachStreamErrorHandlers(logger: Logger): void {
  const pinoStreamSymbol = Symbol.for('pino.stream') as unknown as keyof Logger
  const stream = (logger as unknown as Record<symbol, unknown>)[
    pinoStreamSymbol as symbol
  ] as NodeJS.EventEmitter | undefined
  if (!stream || typeof stream.on !== 'function') return

  stream.on('error', (err: Error) => {
    console.error('[logger] pino stream error:', err.message)
  })

  const workerStream = stream as unknown as { unref?: () => void }
  if (typeof workerStream.unref === 'function') {
    workerStream.unref()
  }
}

const transportTargets = resolveTransportTargets()
const useWorkerTransport = transportTargets.length > 0

export const eventLogger = pino({
  name: config.otel.resourceAttributes.serviceName,
  level: config.logging.level,
  mixin: pinoMixin,
  transport: useWorkerTransport ? { targets: transportTargets } : undefined,
  serializers: {
    err: (err: Error) => ({
      stack: err.stack,
      message: err.message,
    }),
  },
})

attachStreamErrorHandlers(eventLogger)

process.on('uncaughtException', (err) => {
  if (err && err.message === 'the worker has exited') {
    return
  }
  console.error('[uncaughtException]', err)
  throw err
})

export function createEventLogger(component: string) {
  return eventLogger.child({ component })
}
