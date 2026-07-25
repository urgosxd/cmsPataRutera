import { withPayload } from '@payloadcms/next/withPayload'

const NEXT_PUBLIC_SERVER_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['awilix-manager', '@opentelemetry/*', 'pino', 'pino-pretty', 'amqplib'],
  eslint: {
    // Advierte: Esto permite que las compilaciones de producción
    // terminen exitosamente incluso si hay errores de ESLint.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // PELIGRO: Esto permite que las compilaciones de producción
    // terminen exitosamente incluso si hay errores de tipo.
    ignoreBuildErrors: true,
  },
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
      }),
    )

    return config
  },
  output: 'standalone',
  outputFileTracingIncludes: {
    'src/instrumentation.ts': [
      './src/events/tracing/pinoOtlpTransport.cjs',
      './src/events/tracing/pinoPrettyTransport.cjs',
    ],
  },
  images: {
    remotePatterns: [
      ...[NEXT_PUBLIC_SERVER_URL /* 'https://example.com' */].map((item) => {
        const url = new URL(item)

        return {
          hostname: url.hostname,
          protocol: url.protocol.replace(':', ''),
        }
      }),
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
    ],
  },
  reactStrictMode: true,
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
