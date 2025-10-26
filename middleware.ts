import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Middleware for the Casual Chic storefront.
 *
 * This middleware is intentionally minimal and serves two purposes:
 * 1. Satisfy OpenNext Cloudflare's build process which expects middleware files
 * 2. Provide a placeholder for future middleware needs (auth, redirects, etc.)
 *
 * Future Enhancements:
 * - Authentication checks for protected routes
 * - Country/region-based redirects
 * - A/B testing and feature flags
 * - Security headers
 * - Rate limiting
 *
 * @param request - The incoming Next.js request
 * @returns NextResponse - Currently a passthrough, returns the request unchanged
 */
export function middleware(_request: NextRequest) {
  // Currently passthrough - add middleware logic here as needed
  // When implementing auth, consider using Edge Runtime for fastest cold starts
  return NextResponse.next()
}

/**
 * Matcher patterns for middleware execution.
 * Exported for reuse in tests and configuration.
 *
 * Current exclusions:
 * - /api/* - API routes (handled by route handlers)
 * - /_next/static/* - Static assets (CSS, JS, fonts)
 * - /_next/image/* - Next.js image optimization
 * - /favicon.ico - Site favicon
 *
 * Note: Uses negative lookahead with explicit path separators (/) to ensure
 * only exact path prefixes are excluded. This prevents false positives like
 * excluding /api-docs when we only want to exclude /api/*.
 *
 * Future considerations when extending:
 * - Add /admin/ to exclude Payload CMS admin panel if needed
 * - Add /health or /ping for health check endpoints
 * - Add /robots.txt, /sitemap.xml if serving these statically
 * - Add /manifest.json, /browserconfig.xml for PWA files
 * - Add /_vercel/ if deploying to Vercel
 * - Consider service worker routes if implementing PWA
 */
export const MIDDLEWARE_MATCHER = [
  /*
   * Match all request paths except for the ones starting with:
   * - /api or /api/* (API routes)
   * - /_next/static/* (static files)
   * - /_next/image/* (image optimization files)
   * - /favicon.ico (exact match)
   *
   * Note: Uses negative lookahead with (?:/|$) to match both:
   * - /api (exact match using $)
   * - /api/... (paths with trailing slash using /)
   * This prevents false positives like /api-docs while catching /api alone.
   */
  '/((?!api(?:/|$)|_next/static|_next/image|favicon\\.ico).*)',
] as const

/**
 * Next.js middleware configuration.
 */
export const config = {
  matcher: MIDDLEWARE_MATCHER,
}
