// OpenNext Cloudflare configuration
import { defineCloudflareConfig } from '@opennextjs/cloudflare/config'

export default defineCloudflareConfig({
  /**
   * External dependencies that should not be bundled.
   * @opentelemetry/api is optional and not needed in Cloudflare Workers runtime.
   */
  external: ['@opentelemetry/api'],
})
