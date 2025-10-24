import checkEnvVariables from "./check-env-variables.js"
import { withPayload } from '@payloadcms/next/withPayload'

checkEnvVariables()

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone' as const,
  outputFileTracingRoot: __dirname,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  typescript: {
    // Only ignore type errors in development for faster iteration
    // Production builds should catch type errors
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  // Turbopack configuration for Payload CMS compatibility
  turbopack: {},
  // Exclude packages that contain binaries or need special handling
  // Note: Platform-specific @esbuild packages are auto-externalized, only need base packages
  serverExternalPackages: ['drizzle-kit', 'esbuild-register', 'esbuild'],
  images: {
    remotePatterns: [
      {
        protocol: "http" as const,
        hostname: "localhost",
      },
      {
        protocol: "https" as const,
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https" as const,
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https" as const,
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
    ],
  },
  // Cloudflare-specific webpack config
  webpack: (webpackConfig: { resolve: { extensionAlias: Record<string, string[]> } }) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
