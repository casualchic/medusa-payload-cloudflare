// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

// Polyfill TextEncoder/TextDecoder for Node.js test environment
// This fixes esbuild invariant violation in tests
import { TextEncoder, TextDecoder } from 'util'

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder as any
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder as any
}
