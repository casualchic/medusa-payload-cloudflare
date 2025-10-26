/**
 * Vitest setup file for unit tests
 * This runs before any test files are loaded
 */

// Set required environment variables for unit tests
process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL = 'http://localhost:9000'
process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = 'pk_test_1234567890'
