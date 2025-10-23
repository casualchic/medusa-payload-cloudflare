import checkEnvVariables from "./check-env-variables.js"
import { withPayload } from '@payloadcms/next/withPayload'

checkEnvVariables()

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Turbopack is default in Next.js 16 but incompatible with Payload CMS
  // due to esbuild binary parsing issues in drizzle-kit
  // Use --webpack flag for development and builds:
  //   pnpm dev --webpack
  //   pnpm build --webpack
  turbopack: {},
  // Exclude problematic packages from bundling
  serverExternalPackages: ['drizzle-kit', 'esbuild-register', 'esbuild'],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
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
