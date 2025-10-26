// OpenNext Cloudflare configuration
import { defineCloudflareConfig } from '@opennextjs/cloudflare/config'

export default defineCloudflareConfig({
  cloudflare: {
    build: {
      additionalWranglerOptions: {
        external: ['@opentelemetry/api']
      }
    }
  }
})
