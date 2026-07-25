'use strict'

const { Transform } = require('node:stream')
const { request } = require('node:http')

const severityMap = {
  10: { number: 1, text: 'TRACE' },
  20: { number: 5, text: 'DEBUG' },
  30: { number: 9, text: 'INFO' },
  40: { number: 13, text: 'WARN' },
  50: { number: 17, text: 'ERROR' },
  60: { number: 21, text: 'FATAL' },
}

function getSeverity(level) {
  return severityMap[level] ?? { number: 9, text: 'INFO' }
}

function buildOTLPBatch(logs) {
  const logRecords = logs.map((log) => {
    const severity = getSeverity(log.level)
    const attributes = []

    if (log.trace_id) {
      attributes.push({ key: 'trace_id', value: { stringValue: String(log.trace_id) } })
    }
    if (log.span_id) {
      attributes.push({ key: 'span_id', value: { stringValue: String(log.span_id) } })
    }
    if (log.component) {
      attributes.push({ key: 'component', value: { stringValue: String(log.component) } })
    }

    return {
      timeUnixNano: String(log.time * 1000000),
      severityNumber: severity.number,
      severityText: severity.text,
      body: { stringValue: String(log.msg) },
      attributes,
    }
  })

  const payload = {
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'tourism-events' } },
            { key: 'service.version', value: { stringValue: process.env.npm_package_version || '1.0.0' } },
            { key: 'deployment.environment', value: { stringValue: process.env.NODE_ENV || 'production' } },
          ],
        },
        scopeLogs: [
          {
            scope: { name: 'tourism-events' },
            logRecords,
          },
        ],
      },
    ],
  }

  return JSON.stringify(payload)
}

function postWithRetry(endpoint, body, attempt = 1) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint)
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = request(options, (res) => {
      let responseData = ''
      res.on('data', (chunk) => {
        responseData += chunk.toString()
      })
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve()
        } else if (attempt < 3) {
          const delay = Math.pow(2, attempt) * 1000
          setTimeout(() => {
            postWithRetry(endpoint, body, attempt + 1).then(resolve).catch(reject)
          }, delay)
        } else {
          reject(new Error(`OTLP logs export failed: ${res.statusCode} ${responseData}`))
        }
      })
    })

    req.on('error', (err) => {
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000
        setTimeout(() => {
          postWithRetry(endpoint, body, attempt + 1).then(resolve).catch(reject)
        }, delay)
      } else {
        reject(err)
      }
    })

    req.write(body)
    req.end()
  })
}

function pinoOtlpTransport(options) {
  const endpoint = options.endpoint
  const batch = []
  let flushTimer = null
  let isShuttingDown = false

  const flushBatch = async () => {
    if (batch.length === 0) return

    const logsToSend = batch.splice(0, batch.length)
    const body = buildOTLPBatch(logsToSend)

    try {
      await postWithRetry(endpoint, body)
    } catch {
      /* drop on the floor — logs already on stdout, sidecar will retry */
    }
  }

  const scheduleFlush = () => {
    if (flushTimer) return
    flushTimer = setTimeout(() => {
      flushTimer = null
      flushBatch().catch(() => {})
    }, 5000)
  }

  const stream = new Transform({
    transform(chunk, _encoding, callback) {
      try {
        const lines = chunk.toString().split('\n')
        for (const line of lines) {
          if (!line.trim()) continue
          const log = JSON.parse(line)
          batch.push(log)

          if (batch.length >= 100) {
            if (flushTimer) {
              clearTimeout(flushTimer)
              flushTimer = null
            }
            flushBatch().catch(() => {})
          } else {
            scheduleFlush()
          }
        }
        callback()
      } catch (error) {
        callback(error)
      }
    },
    flush(callback) {
      flushBatch().then(() => callback()).catch((err) => callback(err))
    },
  })

  const handleShutdown = () => {
    if (isShuttingDown) return
    isShuttingDown = true
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    flushBatch().catch(() => {})
  }

  process.on('SIGTERM', handleShutdown)
  process.on('SIGINT', handleShutdown)

  return stream
}

module.exports = pinoOtlpTransport
