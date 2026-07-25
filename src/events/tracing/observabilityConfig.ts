/**
 * Observability configuration resolved per runtime mode (dev/test/prod).
 * Mirrors the Quarkus profile pattern: %dev, %test, %prod.
 *
 * Mode is determined by NODE_ENV:
 *   - development → dev profile
 *   - test        → test profile
 *   - production  → prod profile
 *   - undefined   → default profile
 */

export type RuntimeMode = 'dev' | 'test' | 'prod' | 'default'

export interface ObservabilityConfig {
  mode: RuntimeMode
  otel: {
    enabled: boolean
    endpoint: string // OTLP HTTP endpoint (e.g., http://localhost:4318 or http://otel-collector:4318)
    protocol: 'http' // CMS uses HTTP (not gRPC like Quarkus)
    sampler: {
      type: 'parentbased_traceidratio'
      ratio: number // 1.0 = 100%, 0.1 = 10%
    }
    simpleExport: boolean // true = synchronous export (Quarkus otel.simple), false = batched
    metricExportIntervalMs: number // matches Quarkus micrometer step
    resourceAttributes: {
      serviceName: string
      serviceVersion: string
      deploymentEnvironment: string
    }
  }
  prometheus: {
    enabled: boolean // Direct /metrics endpoint (like Quarkus micrometer.prometheus)
    port: number // Default 9464 for PrometheusExporter
  }
  logging: {
    level: string // DEBUG (dev), INFO (test/prod)
    format: 'json' | 'pretty' // pretty (dev), json (test/prod)
    otlpPush: boolean // false everywhere — pino uses stdout JSON in prod, sidecar ships to Collector
    otlpEndpoint: string // logs OTLP endpoint (only honored if otlpPush=true)
  }
}

function resolveMode(): RuntimeMode {
  const nodeEnv = process.env.NODE_ENV
  if (nodeEnv === 'development') return 'dev'
  if (nodeEnv === 'test') return 'test'
  if (nodeEnv === 'production') return 'prod'
  return 'default'
}

// Env var overrides take precedence over mode defaults
function envOrFallback(envVar: string, fallback: string): string {
  return process.env[envVar] ?? fallback
}

function envIntOrFallback(envVar: string, fallback: number): number {
  const val = process.env[envVar]
  if (val !== undefined && val !== '') {
    return parseInt(val, 10)
  }
  return fallback
}

function envFloatOrFallback(envVar: string, fallback: number): number {
  const val = process.env[envVar]
  if (val !== undefined && val !== '') {
    return parseFloat(val)
  }
  return fallback
}

const MODE_DEFAULTS: Record<RuntimeMode, Omit<ObservabilityConfig, 'mode'>> = {
  dev: {
    otel: {
      enabled: envOrFallback('OTEL_SDK_DISABLED', 'false') !== 'true',
      endpoint: envOrFallback('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318'),
      protocol: 'http',
      sampler: {
        type: 'parentbased_traceidratio',
        ratio: envFloatOrFallback('OTEL_TRACES_SAMPLER_ARG', 1.0),
      },
      simpleExport: true,
      metricExportIntervalMs: envIntOrFallback('OTEL_METRIC_EXPORT_INTERVAL', 60000),
      resourceAttributes: {
        serviceName: envOrFallback('OTEL_SERVICE_NAME', 'tourism-events-dev'),
        serviceVersion: process.env.npm_package_version ?? '1.0.0',
        deploymentEnvironment: 'development',
      },
    },
    prometheus: {
      enabled: true,
      port: envIntOrFallback('OTEL_PROMETHEUS_PORT', 9464),
    },
    logging: {
      level: envOrFallback('LOG_LEVEL', 'debug'),
      format: 'pretty',
      otlpPush: !!process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
      otlpEndpoint: envOrFallback('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT', ''),
    },
  },

  test: {
    otel: {
      enabled: envOrFallback('OTEL_SDK_DISABLED', 'false') !== 'true',
      endpoint: envOrFallback('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318'),
      protocol: 'http',
      sampler: {
        type: 'parentbased_traceidratio',
        ratio: 1.0,
      },
      simpleExport: true, // Matches Quarkus otel.simple=true (synchronous export for test reliability)
      metricExportIntervalMs: envIntOrFallback('OTEL_METRIC_EXPORT_INTERVAL', 1000),
      resourceAttributes: {
        serviceName: envOrFallback('OTEL_SERVICE_NAME', 'tourism-events-test'),
        serviceVersion: process.env.npm_package_version ?? '1.0.0',
        deploymentEnvironment: 'test',
      },
    },
    prometheus: {
      enabled: true,
      port: envIntOrFallback('OTEL_PROMETHEUS_PORT', 9464),
    },
    logging: {
      level: envOrFallback('LOG_LEVEL', 'info'),
      format: 'json',
      otlpPush: false,
      otlpEndpoint: '',
    },
  },

  prod: {
    otel: {
      enabled: envOrFallback('OTEL_SDK_DISABLED', 'false') !== 'true',
      endpoint: envOrFallback('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://otel-collector:4318'),
      protocol: 'http',
      sampler: {
        type: 'parentbased_traceidratio',
        ratio: envFloatOrFallback('OTEL_TRACES_SAMPLER_ARG', 0.1),
      },
      simpleExport: false,
      metricExportIntervalMs: envIntOrFallback('OTEL_METRIC_EXPORT_INTERVAL', 60000),
      resourceAttributes: {
        serviceName: envOrFallback('OTEL_SERVICE_NAME', 'tourism-events'),
        serviceVersion: process.env.npm_package_version ?? '1.0.0',
        deploymentEnvironment: 'production',
      },
    },
    prometheus: {
      enabled: true,
      port: envIntOrFallback('OTEL_PROMETHEUS_PORT', 9464),
    },
    logging: {
      level: envOrFallback('LOG_LEVEL', 'info'),
      format: 'json',
      otlpPush: false,
      otlpEndpoint: '',
    },
  },

  default: {
    otel: {
      enabled: envOrFallback('OTEL_SDK_DISABLED', 'false') !== 'true',
      endpoint: envOrFallback('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318'),
      protocol: 'http',
      sampler: {
        type: 'parentbased_traceidratio',
        ratio: envFloatOrFallback('OTEL_TRACES_SAMPLER_ARG', 1.0),
      },
      simpleExport: false,
      metricExportIntervalMs: envIntOrFallback('OTEL_METRIC_EXPORT_INTERVAL', 60000),
      resourceAttributes: {
        serviceName: envOrFallback('OTEL_SERVICE_NAME', 'tourism-events'),
        serviceVersion: process.env.npm_package_version ?? '1.0.0',
        deploymentEnvironment: envOrFallback('NODE_ENV', 'development'),
      },
    },
    prometheus: {
      enabled: true,
      port: envIntOrFallback('OTEL_PROMETHEUS_PORT', 9464),
    },
    logging: {
      level: envOrFallback('LOG_LEVEL', 'info'),
      format: 'pretty',
      otlpPush: !!process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
      otlpEndpoint: envOrFallback('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT', ''),
    },
  },
}

export function getObservabilityConfig(): ObservabilityConfig {
  const mode = resolveMode()
  const defaults = MODE_DEFAULTS[mode]
  return { mode, ...defaults }
}
