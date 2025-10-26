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
// If pnpm-lock.yaml exists, any other lockfile indicates wrong package manager
try {
  const pnpmLockExists = fs.existsSync(path.resolve(process.cwd(), 'pnpm-lock.yaml'))
  const npmLockExists = fs.existsSync(path.resolve(process.cwd(), 'package-lock.json'))
  const yarnLockExists = fs.existsSync(path.resolve(process.cwd(), 'yarn.lock'))

  // Warn if pnpm-lock.yaml exists alongside npm/yarn lockfiles (wrong package manager used)
  const wrongPackageManagerUsed = pnpmLockExists && (npmLockExists || yarnLockExists)
  if (wrongPackageManagerUsed) {
    console.warn('\n' + '='.repeat(60))
    console.warn('⚠️  WARNING: This project requires pnpm')
    console.warn('='.repeat(60))
    console.warn('npm and yarn handle peer dependencies differently')
    console.warn('This may cause @opentelemetry/api to be auto-installed')
    console.warn('')
    console.warn('Install pnpm: npm install -g pnpm')
    console.warn('Then run: pnpm install')
    console.warn('='.repeat(60) + '\n')
  }
} catch (error) {
  console.warn('⚠️  Could not verify package manager:', error.message)
}

const apiPath = path.resolve(process.cwd(), 'node_modules/@opentelemetry/api')

// Check if package exists (handles both directories and symlinks)
if (fs.existsSync(apiPath)) {
  console.error('\n' + '='.repeat(60))
  console.error('❌ ERROR: @opentelemetry/api is installed')
  console.error('='.repeat(60))
  console.error('This package causes deployment failures on Cloudflare Workers')
  console.error('It should be excluded via peerDependencyRules.ignoreMissing')
  console.error('')
  console.error('To fix:')
  console.error('1. Check package.json has peerDependencyRules.ignoreMissing')
  console.error('2. Run: rm -rf node_modules pnpm-lock.yaml')
  console.error('3. Run: pnpm install')
  console.error('')
  console.error('See: DEPLOYMENT_LEARNINGS.md section 6')
  console.error('='.repeat(60) + '\n')

  // Exit with error in CI or strict mode, warn in development
  // CI=true is set by most CI providers (GitHub Actions, GitLab CI, Travis, etc.)
  // STRICT_DEPS=true can be used to enforce locally (e.g., pre-commit hooks)
  if (process.env.CI || process.env.STRICT_DEPS) {
    process.exit(1)
  }
  // In development: allow continuation while alerting to the issue
} else {
  // Silent success - no spam on every dev start
  // Set DEBUG=1 to see verification message: DEBUG=1 pnpm dev
  if (process.env.DEBUG) {
    console.log('✅ Dependencies verified: @opentelemetry/api not installed')
  }
}

// Explicit success exit code (helpful for script chaining and clarity)
process.exit(0)
