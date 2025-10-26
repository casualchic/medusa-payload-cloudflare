import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

/**
 * Critical Dependencies Configuration Tests
 *
 * These unit tests verify the @opentelemetry/api exclusion configuration.
 * Integration testing (Next.js build/start) is covered by CI workflow.
 *
 * Test Coverage:
 * - Unit: Configuration presence and correctness (this file)
 * - Integration: Full build process in .github/workflows/deploy.yml
 * - Runtime: Development check in scripts/verify-dependencies.cjs
 */
describe('Critical Dependencies Configuration', () => {
  it('should have @opentelemetry/api in serverExternalPackages', () => {
    const nextConfigPath = resolve(process.cwd(), 'next.config.ts')
    const nextConfigContent = readFileSync(nextConfigPath, 'utf-8')
    
    // Verify @opentelemetry/api is marked as external
    expect(nextConfigContent).toContain('@opentelemetry/api')
    expect(nextConfigContent).toContain('serverExternalPackages')
    
    // Verify it's in the serverExternalPackages array
    // Use [\s\S] to match across multiple lines including newlines
    const serverExternalMatch = nextConfigContent.match(/serverExternalPackages:\s*\[([\s\S]*?)\]/m)
    expect(serverExternalMatch).toBeTruthy()
    expect(serverExternalMatch![1]).toContain('@opentelemetry/api')
  })

  it('should document why @opentelemetry/api is external', () => {
    const nextConfigPath = resolve(process.cwd(), 'next.config.ts')
    const nextConfigContent = readFileSync(nextConfigPath, 'utf-8')

    // Verify there's a comment explaining the externalization
    const lines = nextConfigContent.split('\n')
    // Find the actual config line (with colon and array), not just a comment mentioning it
    const externalPackagesLineIndex = lines.findIndex(line =>
      line.includes('serverExternalPackages') && line.includes(':') && line.includes('[')
    )

    // Check for explanatory comment within 5 lines before the config
    const precedingLines = lines.slice(Math.max(0, externalPackagesLineIndex - 5), externalPackagesLineIndex)
    const hasExplanation = precedingLines.some(line =>
      line.includes('opentelemetry') ||
      line.includes('platform') ||
      line.includes('Workers')
    )

    expect(hasExplanation).toBe(true)
  })

  it('should not have @opentelemetry/api in pnpm lockfile', () => {
    const lockfilePath = resolve(process.cwd(), 'pnpm-lock.yaml')
    const lockfileContent = readFileSync(lockfilePath, 'utf-8')

    // Verify @opentelemetry/api is not in the lockfile packages section
    // This ensures pnpm doesn't auto-install it as a peer dependency
    // Match any package entry with @ version separator (simplest and most comprehensive)
    // Note: Pattern is intentionally simple - '@opentelemetry/api@' reliably identifies package entries
    // Edge case: Could theoretically match if package name appears in comments, but pnpm lockfiles
    // don't contain comments and use consistent structured format
    expect(lockfileContent).not.toMatch(/@opentelemetry\/api@/)
  })

  it('should have peerDependencyRules.ignoreMissing for @opentelemetry/api', () => {
    const packageJsonPath = resolve(process.cwd(), 'package.json')
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(packageJsonContent)

    // Verify pnpm is configured to ignore the missing peer dependency
    expect(packageJson.pnpm).toBeDefined()
    expect(packageJson.pnpm.peerDependencyRules).toBeDefined()
    expect(packageJson.pnpm.peerDependencyRules.ignoreMissing).toBeDefined()
    expect(packageJson.pnpm.peerDependencyRules.ignoreMissing).toContain('@opentelemetry/api')
  })

  it('should not have @opentelemetry/api directory in node_modules', () => {
    const apiPath = resolve(process.cwd(), 'node_modules/@opentelemetry/api')

    // Verify the package directory does not exist at runtime
    // This is the most direct check matching the verification command in DEPLOYMENT_LEARNINGS.md
    // Using existsSync is more explicit than expecting statSync to throw
    expect(existsSync(apiPath)).toBe(false)
  })
})
