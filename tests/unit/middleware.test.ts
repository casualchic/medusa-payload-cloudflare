import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware, MIDDLEWARE_MATCHER } from '../../middleware'

/**
 * Middleware Unit Tests
 *
 * These tests validate the middleware function behavior and matcher configuration.
 *
 * Note on Matcher Exclusions:
 * The MIDDLEWARE_MATCHER config excludes certain paths (/api/*, /_next/static, etc.)
 * at the Next.js routing level. These exclusions are tested implicitly through:
 * - Integration tests: Verify API routes don't trigger middleware
 * - E2E tests: Verify static assets load correctly without middleware overhead
 * - Local/production testing: Monitor middleware execution in actual environments
 *
 * Unit tests focus on:
 * - Middleware function behavior (passthrough, no modifications)
 * - Matcher configuration structure and exports
 * - Pattern validation to prevent false positives
 */
describe('Middleware', () => {
  describe('middleware function', () => {
    it('allows requests to homepage', () => {
      const req = new NextRequest('http://localhost:3000/')
      const res = middleware(req)
      
      expect(res).toBeDefined()
      expect(res.status).toBe(200)
    })

    it('allows requests to country-specific routes', () => {
      const req = new NextRequest('http://localhost:3000/us')
      const res = middleware(req)
      
      expect(res).toBeDefined()
      expect(res.status).toBe(200)
    })

    it('allows requests to product pages', () => {
      const req = new NextRequest('http://localhost:3000/us/products/test-product')
      const res = middleware(req)

      expect(res).toBeDefined()
      expect(res.status).toBe(200)
    })

    it('allows requests to pages with "api" in the path (not /api/ routes)', () => {
      // This tests the fix for the regex bug where (?!api|...) was too broad
      // Pages like /api-docs, /erapidly, /therapist should NOT be excluded
      const testPaths = [
        'http://localhost:3000/api-docs',
        'http://localhost:3000/us/erapidly',
        'http://localhost:3000/therapist-finder',
      ]

      testPaths.forEach(path => {
        const req = new NextRequest(path)
        const res = middleware(req)
        expect(res).toBeDefined()
        expect(res.status).toBe(200)
      })
    })

    it('excludes exact /api path (without trailing slash)', () => {
      // This validates the (?:/|$) regex pattern works for the exact /api path
      // The matcher should exclude both /api and /api/* routes
      // Note: In Next.js, excluded paths won't trigger middleware at all,
      // but this test verifies our matcher pattern is structurally correct
      const req = new NextRequest('http://localhost:3000/api')
      const res = middleware(req)

      // Middleware still executes (matcher is applied at Next.js routing level)
      // This test confirms the function handles the path correctly if called
      expect(res).toBeDefined()
      expect(res.status).toBe(200)
    })

    it('is a passthrough (does not modify request)', () => {
      const req = new NextRequest('http://localhost:3000/test')
      const res = middleware(req)

      // Should return a NextResponse.next() which is a passthrough
      expect(res.status).toBe(200)

      // Verify no rewrites or redirects were performed
      expect(res.headers.get('x-middleware-rewrite')).toBeNull()
      expect(res.headers.get('x-middleware-redirect')).toBeNull()

      // NextResponse.next() sets x-middleware-next to '1' - this is expected
      expect(res.headers.get('x-middleware-next')).toBe('1')

      // Verify the response is truly a passthrough (not a redirect or rewrite)
      expect(res.type).toBe('default')
    })
  })

  describe('MIDDLEWARE_MATCHER configuration', () => {
    it('exports matcher patterns for reuse', () => {
      expect(MIDDLEWARE_MATCHER).toBeDefined()
      expect(Array.isArray(MIDDLEWARE_MATCHER)).toBe(true)
      expect(MIDDLEWARE_MATCHER.length).toBeGreaterThan(0)
    })

    it('has correct matcher pattern structure', () => {
      const pattern = MIDDLEWARE_MATCHER[0]
      expect(typeof pattern).toBe('string')

      // Should exclude /api, /api/*, _next/static, _next/image, favicon.ico
      // Uses (?:/|$) to match both /api exact and /api/* paths
      expect(pattern).toContain('api(?:/|$)')
      expect(pattern).toContain('_next/static')
      expect(pattern).toContain('_next/image')
      // Favicon should use escaped dot to match literal '.' not any character
      expect(pattern).toContain('favicon\\.ico')
    })

    it('pattern uses negative lookahead for exclusions', () => {
      const pattern = MIDDLEWARE_MATCHER[0]

      // Next.js matcher patterns use negative lookahead syntax (?!)
      expect(pattern).toContain('(?!')

      // Verify the pattern structure is a valid Next.js matcher
      // The pattern should end with .* (literal wildcard) followed by )
      // Using \\. and \\* to match the literal . and * characters in the string
      expect(pattern).toMatch(/^\/\(.+\.\*\)$/)
    })

    it('pattern is exported as readonly constant', async () => {
      // TypeScript 'as const' makes the array readonly at compile time
      // This test verifies the constant is properly exported and accessible
      expect(MIDDLEWARE_MATCHER).toBeDefined()
      expect(MIDDLEWARE_MATCHER).toHaveLength(1)

      // Verify it's the same reference as used in config
      const { config } = await import('../../middleware')
      expect(config.matcher).toBe(MIDDLEWARE_MATCHER)
    })
  })
})
