#!/usr/bin/env node
/**
 * Development dependency verification script
 * Checks that @opentelemetry/api is not installed (breaks Cloudflare Workers deployment)
 *
 * This runs before dev server starts to catch configuration issues early.
 * Related: PR #48 - Peer dependency exclusion for Cloudflare Workers compatibility
 */

const fs = require('fs')
const path = require('path')

const apiPath = path.resolve(process.cwd(), 'node_modules/@opentelemetry/api')

if (fs.existsSync(apiPath)) {
  console.error('\n⚠️  WARNING: @opentelemetry/api is installed')
  console.error('   This package causes deployment failures on Cloudflare Workers')
  console.error('   It should be excluded via peerDependencyRules.ignoreMissing')
  console.error('\n   To fix:')
  console.error('   1. Check package.json has peerDependencyRules.ignoreMissing: ["@opentelemetry/api"]')
  console.error('   2. Run: rm -rf node_modules pnpm-lock.yaml')
  console.error('   3. Run: pnpm install')
  console.error('\n   See: DEPLOYMENT_LEARNINGS.md section 6\n')

  // Don't exit with error in development - just warn
  // This allows development to continue while alerting to the issue
} else {
  // Silent success - no need to spam console on every dev start
}
