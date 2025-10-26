// OpenNext Cloudflare configuration
import { defineCloudflareConfig } from '@opennextjs/cloudflare/config'

export default defineCloudflareConfig({
  middleware: {
    external: ['@opentelemetry/api']
  }
})
