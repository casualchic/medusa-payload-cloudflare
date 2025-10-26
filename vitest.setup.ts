// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

// Set test environment variables
process.env.MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || 'test-key'
process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || 'test-secret'
