import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

describe('GitHub Workflows Validation', () => {
  let claudeWorkflowContent: string
  let deployWorkflowContent: string
  
  beforeAll(() => {
    const claudePath = resolve(process.cwd(), '.github/workflows/claude-code-review.yml')
    const deployPath = resolve(process.cwd(), '.github/workflows/deploy.yml')

    expect(existsSync(claudePath)).toBe(true)
    expect(existsSync(deployPath)).toBe(true)

    claudeWorkflowContent = readFileSync(claudePath, 'utf-8')
    deployWorkflowContent = readFileSync(deployPath, 'utf-8')
  })

  describe('Claude Code Review Workflow', () => {
    it('should exist and be readable', () => {
      expect(claudeWorkflowContent).toBeDefined()
      expect(claudeWorkflowContent.length).toBeGreaterThan(0)
    })

    it('should have a descriptive name', () => {
      expect(claudeWorkflowContent).toContain('name:')
      expect(claudeWorkflowContent).toContain('Claude Code Review')
    })

    it('should trigger on pull request events', () => {
      expect(claudeWorkflowContent).toContain('on:')
      expect(claudeWorkflowContent).toContain('pull_request:')
      expect(claudeWorkflowContent).toContain('types:')
      expect(claudeWorkflowContent).toContain('opened')
      expect(claudeWorkflowContent).toContain('synchronize')
    })

    it('should have path filters commented out (required to match main branch)', () => {
      // Path filters must be commented out to match main branch for Claude Code action security validation
      // See: https://github.com/casualchic/cc3-storefront-cloudflare/pull/37#issuecomment-claude-review-workflow-validation
      expect(claudeWorkflowContent).toContain('# Optional: Only run on specific file changes')
      expect(claudeWorkflowContent).toContain('# paths:')
      expect(claudeWorkflowContent).toContain('#   - "src/**/*.ts"')
      expect(claudeWorkflowContent).toContain('#   - "src/**/*.tsx"')
      expect(claudeWorkflowContent).toContain('#   - "src/**/*.js"')
      expect(claudeWorkflowContent).toContain('#   - "src/**/*.jsx"')
    })

    it('should have a claude-review job', () => {
      expect(claudeWorkflowContent).toContain('jobs:')
      expect(claudeWorkflowContent).toContain('claude-review:')
    })

    it('should run on ubuntu-latest', () => {
      expect(claudeWorkflowContent).toContain('runs-on: ubuntu-latest')
    })

    it('should have minimal required permissions', () => {
      expect(claudeWorkflowContent).toContain('permissions:')
      expect(claudeWorkflowContent).toContain('contents: read')
      expect(claudeWorkflowContent).toContain('pull-requests: read')
      expect(claudeWorkflowContent).toContain('issues: read')
      expect(claudeWorkflowContent).toContain('id-token: write')
    })

    it('should checkout repository with shallow fetch', () => {
      expect(claudeWorkflowContent).toContain('- name: Checkout repository')
      expect(claudeWorkflowContent).toContain('uses: actions/checkout@v4')
      expect(claudeWorkflowContent).toContain('fetch-depth: 1')
    })

    it('should use Claude Code Action', () => {
      expect(claudeWorkflowContent).toContain('- name: Run Claude Code Review')
      expect(claudeWorkflowContent).toContain('uses: anthropics/claude-code-action@v1')
    })

    it('should use secret for Claude OAuth token', () => {
      expect(claudeWorkflowContent).toContain('claude_code_oauth_token:')
      expect(claudeWorkflowContent).toContain('${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}')
    })

    it('should have a comprehensive review prompt', () => {
      expect(claudeWorkflowContent).toContain('prompt:')
      expect(claudeWorkflowContent).toContain('Code quality and best practices')
      expect(claudeWorkflowContent).toContain('Potential bugs or issues')
      expect(claudeWorkflowContent).toContain('Performance considerations')
      expect(claudeWorkflowContent).toContain('Security concerns')
      expect(claudeWorkflowContent).toContain('Test coverage')
    })

    it('should have allowed tools configured for Claude', () => {
      expect(claudeWorkflowContent).toContain('claude_args:')
      expect(claudeWorkflowContent).toContain('--allowed-tools')
      expect(claudeWorkflowContent).toContain('gh pr comment')
      expect(claudeWorkflowContent).toContain('gh pr diff')
      expect(claudeWorkflowContent).toContain('gh pr view')
    })

    it('should reference GitHub context variables', () => {
      expect(claudeWorkflowContent).toContain('${{ github.repository }}')
      expect(claudeWorkflowContent).toContain('${{ github.event.pull_request.number }}')
    })

    it('should not have syntax errors in YAML structure', () => {
      // Check for common YAML errors
      const lines = claudeWorkflowContent.split('\n')

      // No tabs (YAML requires spaces)
      lines.forEach((line) => {
        expect(line.includes('\t')).toBe(false)
      })
      
      // Balanced quotes
      const singleQuotes = (claudeWorkflowContent.match(/'/g) || []).length
      const doubleQuotes = (claudeWorkflowContent.match(/"/g) || []).length
      expect(singleQuotes % 2).toBe(0)
      expect(doubleQuotes % 2).toBe(0)
    })
  })

  describe('Deploy Workflow', () => {
    it('should exist and be readable', () => {
      expect(deployWorkflowContent).toBeDefined()
      expect(deployWorkflowContent.length).toBeGreaterThan(0)
    })

    it('should have a descriptive name', () => {
      expect(deployWorkflowContent).toContain('name: Deploy to Cloudflare Workers')
    })

    it('should trigger on push to main', () => {
      expect(deployWorkflowContent).toContain('on:')
      expect(deployWorkflowContent).toContain('push:')
      expect(deployWorkflowContent).toContain('branches: [ main ]')
    })

    it('should trigger on pull requests to main', () => {
      expect(deployWorkflowContent).toContain('pull_request:')
      expect(deployWorkflowContent).toContain('branches: [ main ]')
    })

    it('should have concurrency control to cancel in-progress runs', () => {
      expect(deployWorkflowContent).toContain('concurrency:')
      expect(deployWorkflowContent).toContain('group: ${{ github.workflow }}-${{ github.ref }}')
      expect(deployWorkflowContent).toContain('cancel-in-progress: true')
    })

    it('should have a deploy job', () => {
      expect(deployWorkflowContent).toContain('jobs:')
      expect(deployWorkflowContent).toContain('deploy:')
    })

    it('should run on ubuntu-latest', () => {
      expect(deployWorkflowContent).toContain('runs-on: ubuntu-latest')
    })

    it('should have minimal security permissions', () => {
      expect(deployWorkflowContent).toContain('permissions:')
      expect(deployWorkflowContent).toContain('contents: read')
      expect(deployWorkflowContent).toContain('deployments: write')
    })

    it('should use environment variables from repository vars (not secrets)', () => {
      expect(deployWorkflowContent).toContain('env:')
      // NEXT_PUBLIC_ values should use vars (not secrets) because they're client-exposed and forks need access
      expect(deployWorkflowContent).toContain('NEXT_PUBLIC_MEDUSA_BACKEND_URL: ${{ vars.MEDUSA_BACKEND_URL }}')
      expect(deployWorkflowContent).toContain('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: ${{ vars.MEDUSA_PUBLISHABLE_KEY }}')
    })

    it('should checkout code', () => {
      expect(deployWorkflowContent).toContain('- name: Checkout code')
      expect(deployWorkflowContent).toContain('uses: actions/checkout@v4')
    })

    it('should setup Node.js version 20', () => {
      expect(deployWorkflowContent).toContain('- name: Setup Node.js')
      expect(deployWorkflowContent).toContain('uses: actions/setup-node@v4')
      expect(deployWorkflowContent).toContain("node-version: '20'")
    })

    it('should setup pnpm with pinned SHA for security', () => {
      expect(deployWorkflowContent).toContain('- name: Setup pnpm')
      expect(deployWorkflowContent).toContain('uses: pnpm/action-setup@41ff72655975bd51cab0327fa583b6e92b6d3061')
      expect(deployWorkflowContent).toContain('version: 9.15.9')
    })

    it('should cache pnpm store using built-in cache', () => {
      // We now use actions/setup-node built-in caching instead of manual cache
      expect(deployWorkflowContent).toContain('- name: Setup Node.js')
      expect(deployWorkflowContent).toContain("cache: 'pnpm'")
      // Manual cache steps should NOT exist anymore
      expect(deployWorkflowContent).not.toContain('- name: Get pnpm store directory')
      expect(deployWorkflowContent).not.toContain('- name: Setup pnpm cache')
    })

    it('should cache Next.js build', () => {
      const nextjsCacheSection =
        deployWorkflowContent.match(/- name: Cache Next\.js build[\s\S]*?(?=\n    - name:|$)/)?.[0] || ''

      expect(nextjsCacheSection).toContain('- name: Cache Next.js build')
      expect(nextjsCacheSection).toContain('uses: actions/cache@v4')
      expect(nextjsCacheSection).toContain('path: .next/cache')
      // Cache key should include Node.js version to avoid stale caches after Node upgrades
      expect(nextjsCacheSection).toContain('node20-nextjs')
      // Allow additional globs in hashFiles, but require pnpm-lock.yaml to be included.
      const keyMatches = nextjsCacheSection.match(
        /key:\s*\$\{\{\s*runner\.os\s*\}\}-node20-nextjs-\$\{\{\s*hashFiles\([^)]*'pnpm-lock\.yaml'[^)]*\)\s*\}\}/
      )
      expect(keyMatches).toBeTruthy()
    })

    it('should have proper Next.js cache key with source file hashing', () => {
      // Extract the full cache key section (split across multiple hashFiles calls)
      const cacheKeySection = deployWorkflowContent.match(/key:.*nextjs.*[\s\S]*?\}\}/)?.[0] || ''

      // Verify cache key includes lockfile for dependency changes
      expect(cacheKeySection).toContain('pnpm-lock.yaml')

      // Cache key includes source directories (uses *.[jt]s* pattern for both .ts and .tsx)
      expect(cacheKeySection).toMatch(/src\/\*\*\/\*\.\[jt\]s\*/)
      expect(cacheKeySection).toMatch(/app\/\*\*\/\*\.\[jt\]s\*/)

      // Cache key includes styles (separate hash to avoid collision)
      expect(cacheKeySection).toContain('**/*.css')
      expect(cacheKeySection).toContain('**/*.scss')

      // Cache key includes root-level files and config files that affect build outputs
      expect(cacheKeySection).toContain('middleware.ts')
      expect(cacheKeySection).toContain('next.config.*')
      expect(cacheKeySection).toContain('open-next.config.*')
      expect(cacheKeySection).toContain('tailwind.config.*')
      expect(cacheKeySection).toContain('tsconfig*.json')
    })

    it('should install dependencies with frozen lockfile', () => {
      expect(deployWorkflowContent).toContain('- name: Install dependencies')
      expect(deployWorkflowContent).toContain('run: pnpm install --frozen-lockfile')
    })

    it('should run linting', () => {
      expect(deployWorkflowContent).toContain('- name: Run linting')
      expect(deployWorkflowContent).toContain('run: pnpm run lint')
    })

    it('should run unit tests with proper environment', () => {
      expect(deployWorkflowContent).toContain('- name: Run unit tests')
      expect(deployWorkflowContent).toContain('run: pnpm run test:unit')
      expect(deployWorkflowContent).toContain('NODE_ENV: test')
    })

    it('should run integration tests with proper environment', () => {
      expect(deployWorkflowContent).toContain('- name: Run integration tests')
      expect(deployWorkflowContent).toContain('run: pnpm run test:int')
      expect(deployWorkflowContent).toContain('NODE_ENV: test')
      // Should use 64-char hex test secret (matches production validation requirements)
      expect(deployWorkflowContent).toMatch(/PAYLOAD_SECRET:\s+[0-9a-f]{64}/)
    })

    it('should build Next.js application with webpack in both steps', () => {
      const prod = deployWorkflowContent.match(/- name: Build Next\.js application \(Production\)[\s\S]*?(?=\n    - name:|$)/)?.[0] || ''
      const pr = deployWorkflowContent.match(/- name: Build Next\.js application \(PR\)[\s\S]*?(?=\n    - name:|$)/)?.[0] || ''
      ;[prod, pr].forEach(section => {
        expect(section).toContain('pnpm exec cross-env')
        // Should disable Next.js telemetry in CI for reproducibility
        expect(section).toContain("NEXT_TELEMETRY_DISABLED: '1'")
        expect(section).toContain('--no-deprecation')
        expect(section).toContain('--max-old-space-size=8000')
        expect(section).toContain('next build --webpack')
      })
    })

    it('should have separate build steps for production and PRs', () => {
      // Production build step
      const productionBuildSection = deployWorkflowContent.match(/- name: Build Next\.js application \(Production\)[\s\S]*?(?=\n    # |    - name:|$)/)?.[0] || ''
      expect(productionBuildSection).toContain("if: github.ref == 'refs/heads/main'")
      expect(productionBuildSection).toContain('PAYLOAD_SECRET: ${{ secrets.PAYLOAD_SECRET }}')
      expect(productionBuildSection).not.toMatch(/PAYLOAD_SECRET:\s+[0-9a-f]{64}/)

      // PR build step
      const prBuildSection = deployWorkflowContent.match(/- name: Build Next\.js application \(PR\)[\s\S]*?(?=\n    - name:|$)/)?.[0] || ''
      expect(prBuildSection).toContain("if: github.ref != 'refs/heads/main'")
      // PR builds use hardcoded test secret (64-char hex, matches production requirements)
      expect(prBuildSection).toMatch(/PAYLOAD_SECRET:\s+[0-9a-f]{64}/)
    })

    it('should have production build with no fallback for PAYLOAD_SECRET', () => {
      const productionBuildSection = deployWorkflowContent.match(/- name: Build Next\.js application \(Production\)[\s\S]*?(?=\n    # |    - name:|$)/)?.[0] || ''

      // Production should use secrets.PAYLOAD_SECRET only, no fallback
      expect(productionBuildSection).toContain('PAYLOAD_SECRET: ${{ secrets.PAYLOAD_SECRET }}')
      expect(productionBuildSection).not.toContain('||')
      expect(productionBuildSection).not.toMatch(/PAYLOAD_SECRET:\s+[0-9a-f]{64}/)
    })

    it('should have deployment step conditional on main branch', () => {
      const deploySection = deployWorkflowContent.match(/- name: Build and Deploy to Cloudflare Workers[\s\S]*?(?=\n  [a-z]|\n[a-z]|$)/)?.[0] || ''
      
      expect(deploySection).toContain('- name: Build and Deploy to Cloudflare Workers')
      expect(deploySection).toContain("if: github.ref == 'refs/heads/main'")
    })

    it('should deploy to Cloudflare with proper secrets', () => {
      const deploySection = deployWorkflowContent.match(/- name: Build and Deploy to Cloudflare Workers[\s\S]*?(?=\n  [a-z]|\n[a-z]|$)/)?.[0] || ''
      
      expect(deploySection).toContain('opennextjs-cloudflare build')
      expect(deploySection).toContain('opennextjs-cloudflare deploy')
      expect(deploySection).toContain('--skipNextBuild')
      expect(deploySection).toContain('--env production')
      expect(deploySection).toContain('CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}')
      expect(deploySection).toContain('CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}')
    })

    it('should have proper environment variables for production build', () => {
      const productionBuildSection =
        deployWorkflowContent.match(/- name: Build Next\.js application \(Production\)[\s\S]*?(?=\n    - name:|$)/)?.[0] || ''
      expect(productionBuildSection).toContain('NODE_ENV: production')
      expect(productionBuildSection).toContain('NEXT_PHASE: phase-production-build')
    })

    it('should use hardcoded test secret for PR builds (not repository variable)', () => {
      // Capture the entire PR build section including the comprehensive security documentation
      const prBuildSection =
        deployWorkflowContent.match(/# ━━━[\s\S]*?PR Build Configuration[\s\S]*?- name: Build Next\.js application \(PR\)[\s\S]*?(?=\n    - name:|$)/)?.[0] || ''

      // Should use hardcoded 64-char hex test secret (matches production validation requirements)
      expect(prBuildSection).toMatch(/PAYLOAD_SECRET:\s+[0-9a-f]{64}/)

      // Should NOT use repository variables (security risk - readable by forks)
      expect(prBuildSection).not.toContain('vars.TEST_PAYLOAD_SECRET')

      // Should have comprehensive security documentation explaining the pattern
      expect(prBuildSection).toContain('SECURITY NOTE')
      expect(prBuildSection).toContain('GitHub Secrets are NOT available to fork PRs')
      expect(prBuildSection).toContain('grants ZERO access to production systems')
    })

    it('should not have syntax errors in YAML structure', () => {
      const lines = deployWorkflowContent.split('\n')
      
      // No tabs
      lines.forEach((line) => {
        expect(line.includes('\t')).toBe(false)
      })
      
      // Balanced quotes
      const singleQuotes = (deployWorkflowContent.match(/'/g) || []).length
      const doubleQuotes = (deployWorkflowContent.match(/"/g) || []).length
      expect(singleQuotes % 2).toBe(0)
      expect(doubleQuotes % 2).toBe(0)
    })

    it('should have comments explaining build configuration', () => {
      expect(deployWorkflowContent).toContain('# Build with webpack flag instead of Turbopack')
      expect(deployWorkflowContent).toContain('# --no-deprecation: Suppress deprecation warnings')
      expect(deployWorkflowContent).toContain('# --max-old-space-size=8000: Allocate 8GB memory')
      // Accept either comment style for the split build approach
      const hasExplanatoryComment =
        deployWorkflowContent.includes('# Production build (main branch) - requires real PAYLOAD_SECRET') ||
        deployWorkflowContent.includes('# PR build - uses test secret fallback for TypeScript validation')
      expect(hasExplanatoryComment).toBe(true)
    })
  })

  describe('Cross-Workflow Consistency', () => {
    it('should use consistent action versions', () => {
      const claudeCheckoutVersion = claudeWorkflowContent.match(/actions\/checkout@v(\d+)/)?.[1]
      const deployCheckoutVersion = deployWorkflowContent.match(/actions\/checkout@v(\d+)/)?.[1]
      
      expect(claudeCheckoutVersion).toBe(deployCheckoutVersion)
    })

    it('should follow security best practices', () => {
      // Both workflows should have explicit permissions
      expect(claudeWorkflowContent).toContain('permissions:')
      expect(deployWorkflowContent).toContain('permissions:')
      
      // Both should use secrets, not hardcoded values
      expect(claudeWorkflowContent).toContain('secrets.')
      expect(deployWorkflowContent).toContain('secrets.')
    })

    it('should use ubuntu-latest as runner', () => {
      expect(claudeWorkflowContent).toContain('runs-on: ubuntu-latest')
      expect(deployWorkflowContent).toContain('runs-on: ubuntu-latest')
    })

    it('should not contain any hardcoded credentials', () => {
      // Check for common patterns of hardcoded secrets at line starts (ignore comments)
      const patterns = [
        /^(?!\s*#).*?\bpassword:\s*["'][^"']+["']/gim,
        /^(?!\s*#).*?\bapi[_-]?key:\s*["'][^"']+["']/gim,
        /^(?!\s*#).*?\b(secret|token):\s*["'][^"']+["']/gim,
      ]

      // Allowlist for intentional test secrets (64-char hex pattern)
      const allowlist = [
        /PAYLOAD_SECRET:\s+[0-9a-f]{64}/  // PR test secret is intentional (matches production requirements)
      ]

      patterns.forEach(pattern => {
        const claudeMatches = Array.from(claudeWorkflowContent.matchAll(pattern))
        const deployMatches = Array.from(deployWorkflowContent.matchAll(pattern))

        // If matches exist, they should be either templated or on the allowlist
        claudeMatches.forEach(matchResult => {
          const match = matchResult[0]
          const allowed = allowlist.some(a => a.test(match))
          expect(allowed || match.includes('${{')).toBe(true)
        })

        deployMatches.forEach(matchResult => {
          const match = matchResult[0]
          const allowed = allowlist.some(a => a.test(match))
          expect(allowed || match.includes('${{')).toBe(true)
        })
      })
    })
  })

  describe('Workflow Files Existence', () => {
    it('should have both workflow files present', () => {
      expect(existsSync('.github/workflows/claude-code-review.yml')).toBe(true)
      expect(existsSync('.github/workflows/deploy.yml')).toBe(true)
    })
  })

  describe('Optimization and Performance', () => {
    it('deploy workflow should implement caching strategy', () => {
      const cacheCount = (deployWorkflowContent.match(/uses: actions\/cache@v4/g) || []).length

      // Should have at least 2 cache steps (Next.js + Vitest; pnpm uses setup-node built-in caching)
      expect(cacheCount).toBeGreaterThanOrEqual(2)
    })

    it('deploy workflow cache keys should be deterministic', () => {
      expect(deployWorkflowContent).toContain('hashFiles')

      // Count how many hashFiles calls
      const hashFilesCount = (deployWorkflowContent.match(/hashFiles/g) || []).length
      expect(hashFilesCount).toBeGreaterThanOrEqual(2) // pnpm lock and Next.js cache
    })

    it('claude workflow should use shallow clone for speed', () => {
      expect(claudeWorkflowContent).toContain('fetch-depth: 1')
    })

    it('deploy workflow should use frozen lockfile for reproducibility', () => {
      expect(deployWorkflowContent).toContain('--frozen-lockfile')
    })
  })

  describe('Workflow Trigger Configuration', () => {
    it('claude workflow should have commented path filters (for future enablement)', () => {
      // Path filters are commented out to match main branch (required for Claude Code action)
      // They are preserved as examples for future enablement after PR merge
      const commentedFilters = [
        '#   - "src/**/*.ts"',
        '#   - "src/**/*.tsx"',
        '#   - "src/**/*.js"',
        '#   - "src/**/*.jsx"'
      ]

      commentedFilters.forEach(filter => {
        expect(claudeWorkflowContent).toContain(filter)
      })
    })

    it('deploy workflow should not have path filters', () => {
      const deployTriggerSection = deployWorkflowContent.match(/on:[\s\S]*?jobs:/)?.[0] || ''
      
      // Deploy workflow should not restrict to specific paths
      expect(deployTriggerSection).not.toContain('paths:')
    })
  })

  describe('Step Dependencies and Order', () => {
    it('deploy workflow should have steps in correct order', () => {
      const stepNames = Array.from(
        deployWorkflowContent.matchAll(/- name: (.*)/g)
      ).map(match => match[1])

      const requiredSteps = [
        'Checkout code',
        'Setup pnpm',
        'Setup Node.js',
        'Cache Next.js build',
        'Install dependencies',
        'Cache Vitest',
        'Run linting',
        'Run unit tests',
        'Run integration tests',
        'Validate Production Secrets',
        'Validate Cloudflare Credentials',
        'Build Next.js application (Production)',
        'Build Next.js application (PR)',
        'Build and Deploy to Cloudflare Workers'
      ]

      // Verify all required steps are present
      const allPresent = requiredSteps.every(step => stepNames.includes(step))
      expect(allPresent).toBe(true)

      // Verify critical ordering constraints using relative positions
      const idx = (name: string) => stepNames.indexOf(name)

      // Basic setup sequence
      expect(idx('Checkout code')).toBeLessThan(idx('Setup pnpm'))
      expect(idx('Setup pnpm')).toBeLessThan(idx('Setup Node.js'))
      expect(idx('Cache Next.js build')).toBeLessThan(idx('Install dependencies'))

      // Tests should run in sequence
      expect(idx('Run unit tests')).toBeLessThan(idx('Run integration tests'))

      // CRITICAL: Secret validation must happen before production build
      expect(idx('Validate Production Secrets')).toBeLessThan(idx('Build Next.js application (Production)'))
      expect(idx('Validate Cloudflare Credentials')).toBeLessThan(idx('Build Next.js application (Production)'))

      // Build before deploy
      expect(idx('Build Next.js application (Production)')).toBeLessThan(idx('Build and Deploy to Cloudflare Workers'))
    })

    it('should harden bash scripts with strict error handling', () => {
      // Extract secret validation script
      const secretValidation = deployWorkflowContent.match(/- name: Validate Production Secrets[\s\S]*?(?=\n    - name:|$)/)?.[0] || ''
      // Should use set -euo pipefail for fail-fast behavior
      expect(secretValidation).toContain('set -euo pipefail')
      // Should use LC_ALL=C for deterministic locale behavior
      expect(secretValidation).toContain('export LC_ALL=C')
      // Should use printf instead of echo to avoid side effects
      expect(secretValidation).toMatch(/printf '%s'/)

      // Extract Cloudflare validation script
      const cloudflareValidation = deployWorkflowContent.match(/- name: Validate Cloudflare Credentials[\s\S]*?(?=\n    - name:|$)/)?.[0] || ''
      // Should also use strict error handling
      expect(cloudflareValidation).toContain('set -euo pipefail')
    })

    it('claude workflow should have steps in correct order', () => {
      const stepNames = Array.from(
        claudeWorkflowContent.matchAll(/- name: (.*)/g)
      ).map(match => match[1])
      
      const expectedOrder = [
        'Checkout repository',
        'Run Claude Code Review'
      ]
      
      expect(stepNames).toEqual(expectedOrder)
    })
  })
})