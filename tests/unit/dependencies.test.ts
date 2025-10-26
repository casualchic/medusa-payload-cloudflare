import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

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
})
