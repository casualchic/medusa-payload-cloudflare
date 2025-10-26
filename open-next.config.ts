// OpenNext Cloudflare configuration
import { defineCloudflareConfig } from '@opennextjs/cloudflare/config'

const cloudflareConfig = defineCloudflareConfig({
  // Using default configuration
})

export default {
  ...cloudflareConfig,
  cloudflare: {
    ...cloudflareConfig.cloudflare,
    // Disable validation to allow middleware.external=false workaround
    // This is necessary to avoid createRequire(import.meta.url) error on Cloudflare Workers
    dangerousDisableConfigValidation: true,
  },
  // Bundle middleware internally instead of creating separate external handler
  // This avoids the createRequire(import.meta.url) error on Cloudflare Workers
  // When external=false, middleware is bundled into the server function
  // See: https://github.com/opennextjs/opennextjs-cloudflare/issues
  middleware: {
    external: false,  // Bundle internally to avoid createRequire issues
  },
}
