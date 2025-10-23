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

function checkEnvVariables() {
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
