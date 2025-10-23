import c from "ansi-colors"

const requiredEnvs = [
  {
    key: "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
    description:
      "Learn how to create a publishable key: https://docs.medusajs.com/v2/resources/storefront-development/publishable-api-keys",
  },
]

// At least one backend URL must be provided
const requiredBackendUrl = [
  "MEDUSA_BACKEND_URL",
  "NEXT_PUBLIC_MEDUSA_BACKEND_URL"
]

/**
 * Validate required environment variables for the application and terminate the process if any are missing.
 *
 * Checks for the publishable key and for at least one backend URL (MEDUSA_BACKEND_URL or NEXT_PUBLIC_MEDUSA_BACKEND_URL).
 * When running on Cloudflare Pages (CF_PAGES === '1') the check is skipped and an informational message is logged.
 * If required variables are missing, logs a formatted error listing and exits the process with code 1.
 */
function checkEnvVariables() {
  /**
   * For Cloudflare Workers deployments:
   * - GitHub Actions provides env vars at build time and deploys via wrangler
   * - Runtime vars are defined in wrangler.jsonc env.production section
   *
   * Skip validation if in CI without vars (indicates Cloudflare Pages auto-build
   * which we don't use - deployment is via GitHub Actions workflow)
   */
  if (process.env.CI === 'true' && !process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) {
    console.log(c.yellow('⚠️  CI build without env vars detected - skipping validation (vars defined in wrangler.jsonc for runtime)'))
    return
  }

  const missingEnvs = requiredEnvs.filter(function (env) {
    return !process.env[env.key]
  })

  // Check if at least one backend URL is provided
  const hasBackendUrl = requiredBackendUrl.some(function (key) {
    return process.env[key]
  })

  if (!hasBackendUrl) {
    missingEnvs.push({
      key: "MEDUSA_BACKEND_URL or NEXT_PUBLIC_MEDUSA_BACKEND_URL",
      description:
        "At least one backend URL is required. Set MEDUSA_BACKEND_URL for server-only or NEXT_PUBLIC_MEDUSA_BACKEND_URL for client-side access.",
    })
  }

  if (missingEnvs.length > 0) {
    console.error(
      c.red.bold("\n🚫 Error: Missing required environment variables\n")
    )

    missingEnvs.forEach(function (env) {
      console.error(c.yellow(`  ${c.bold(env.key)}`))
      if (env.description) {
        console.error(c.dim(`    ${env.description}\n`))
      }
    })

    console.error(
      c.yellow(
        "\nPlease set these variables in your .env file or environment before starting the application.\n"
      )
    )

    process.exit(1)
  }
}

export default checkEnvVariables