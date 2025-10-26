/**
 * Development dependency verification script
 * Checks that @opentelemetry/api is not installed (breaks Cloudflare Workers deployment)
 *
 * This runs before dev server starts to catch configuration issues early.
 * Always invoked via: node scripts/verify-dependencies.cjs (shebang not needed)
 * Related: PR #48 - Peer dependency exclusion for Cloudflare Workers compatibility
 */

const fs = require('fs')
const path = require('path')

// Verify pnpm is being used (npm/yarn handle peer dependencies differently)
// Check both npm_execpath (when run via npm script) and lockfile presence
const execPath = process.env.npm_execpath || ''
const pnpmLockExists = fs.existsSync(path.resolve(process.cwd(), 'pnpm-lock.yaml'))
const npmLockExists = fs.existsSync(path.resolve(process.cwd(), 'package-lock.json'))
const yarnLockExists = fs.existsSync(path.resolve(process.cwd(), 'yarn.lock'))

// Warn if using wrong package manager (detected by lockfile or execpath)
if ((npmLockExists || yarnLockExists || (execPath && !execPath.includes('pnpm'))) && pnpmLockExists) {
  console.warn('\n⚠️  WARNING: This project requires pnpm')
  console.warn('   npm and yarn handle peer dependencies differently')
  console.warn('   This may cause @opentelemetry/api to be auto-installed')
  console.warn('\n   Install pnpm: npm install -g pnpm')
  console.warn('   Then run: pnpm install\n')
}

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
  // Silent success - no spam on every dev start
  // Set DEBUG=1 to see verification message: DEBUG=1 pnpm dev
  if (process.env.DEBUG) {
    console.log('✅ Dependencies verified: @opentelemetry/api not installed')
  }
}
