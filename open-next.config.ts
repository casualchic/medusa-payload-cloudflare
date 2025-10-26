// OpenNext Cloudflare configuration
import { defineCloudflareConfig } from '@opennextjs/cloudflare/config'

const baseConfig = defineCloudflareConfig({
  // Using default configuration
})

export default {
  ...baseConfig,
  // Mark @opentelemetry/api as external for esbuild bundler
  // This package contains Node.js platform-specific code incompatible with Cloudflare Workers
  // See: DEPLOYMENT_LEARNINGS.md section 6
  edgeExternals: [
    ...(baseConfig.edgeExternals || []),
    '@opentelemetry/api',
  ],
}
