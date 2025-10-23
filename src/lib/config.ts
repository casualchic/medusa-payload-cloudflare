import Medusa from "@medusajs/js-sdk"

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

if (!MEDUSA_BACKEND_URL) {
  throw new Error(
    'Missing required environment variable: MEDUSA_BACKEND_URL or NEXT_PUBLIC_MEDUSA_BACKEND_URL. ' +
    'Please set one of these in your .env.local file.'
  )
}

if (!process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing required environment variable: NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY. ' +
    'Please set this in your .env.local file. Get your key from your Medusa admin dashboard.'
  )
}

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  auth: {
    type: "session",
  },
})
