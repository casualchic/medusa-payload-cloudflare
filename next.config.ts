import checkEnvVariables from "./check-env-variables.js"
import { withPayload } from '@payloadcms/next/withPayload'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

checkEnvVariables()

// Global flag to track Cloudflare initialization status
// Can be checked at runtime to determine if Cloudflare features are available
// Usage: if (global.cloudflareInitialized) { /* use Cloudflare features */ }
declare global {
  var cloudflareInitialized: boolean
}

// Initialize OpenNext Cloudflare for local development
// Integrates the Next.js dev server with Cloudflare adapter for better local testing
//
// Note: Initialization is fire-and-forget to avoid blocking the dev server
// - If initialization succeeds: Cloudflare features (D1, KV, R2) work locally
// - If initialization fails: Dev server still starts, but Cloudflare features won't work
// - Check global.cloudflareInitialized at runtime to conditionally use Cloudflare features
//
// This allows developers to work on non-Cloudflare features even if wrangler.toml
// is misconfigured or Cloudflare bindings are unavailable
if (process.env.NODE_ENV === 'development') {
  // Initialize flag to false
  global.cloudflareInitialized = false

  // Use fire-and-forget pattern to avoid blocking module loading
  // Errors are logged but don't prevent dev server from starting
  void initOpenNextCloudflareForDev()
    .then(() => {
      global.cloudflareInitialized = true
      console.log('✅ Cloudflare development environment initialized successfully')
    })
    .catch((error) => {
      global.cloudflareInitialized = false
      console.error('❌ Failed to initialize OpenNext Cloudflare for development:', error)
      console.error('💡 Cloudflare features (D1, KV, R2) will not work locally')
      console.error('🔧 Check your wrangler.toml and environment configuration')
      console.error('⚠️  You can still develop non-Cloudflare features')
      // Do not exit - allow dev server to continue for non-Cloudflare development
    })
} else {
  // In production, Cloudflare is always initialized by the platform
  global.cloudflareInitialized = true
}

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
    // DEVELOPMENT: Ignore type errors for faster iteration
    // PRODUCTION: Type errors will fail the build (this setting is ignored in production)
    //
    // Rationale:
    //   - Dev mode: Hot reload is prioritized over type checking for rapid iteration
    //   - Prod mode: CI pipeline catches all type errors before deployment
    //   - IDEs: Developers still see type errors in real-time via LSP
    //
    // Alternative approaches considered:
    //   1. Run tsc --noEmit --watch in parallel (recommended for stricter projects)
    //   2. Use explicit flag: process.env.SKIP_TYPE_CHECK === 'true'
    //   3. Remove this flag entirely (strictest, slower dev experience)
    //
    // Current approach chosen for:
    //   - Faster hot reload during development
    //   - No impact on production safety (CI catches all errors)
    //   - IDE still provides immediate feedback
    //
    // To run type checking manually during dev:
    //   pnpm exec tsc --noEmit
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  // Turbopack configuration for Payload CMS compatibility
  // Note: Turbopack respects serverExternalPackages for build-time exclusions
  turbopack: {},
  // Exclude packages that contain binaries or need special handling
  // Note: Platform-specific @esbuild packages are auto-externalized, only need base packages
  // @opentelemetry/api: Has platform-specific code incompatible with Workers runtime
  serverExternalPackages: ['drizzle-kit', 'esbuild-register', 'esbuild', '@opentelemetry/api'],
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
  // Cloudflare-specific webpack config (fallback only)
  // Note: Turbopack is the default bundler in Next.js 16
  // This webpack config only runs if you explicitly use --webpack flag
  webpack: (webpackConfig: { resolve: { extensionAlias: Record<string, string[]> } }) => {
    // Ensure TypeScript file extensions are resolved correctly for Cloudflare Workers
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
