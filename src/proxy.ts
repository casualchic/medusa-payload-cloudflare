import { NextRequest, NextResponse } from 'next/server'

/**
 * Handle incoming requests by enforcing a two-letter country prefix or redirecting to `/us`.
 *
 * Passes through requests for static assets, API/admin/_next/favicon routes, and URLs whose first path segment is a lowercase two-letter country code. Redirects the root path `/` to `/us`, and redirects other paths that lack a country code to `/us<original-path>` using HTTP status 307.
 *
 * @param request - The incoming Next.js request
 * @returns A NextResponse that either continues request processing or redirects to the appropriate `/us`-prefixed URL with status 307
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip middleware for static assets, API routes, admin, etc.
  if (
    pathname.includes('.') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Split pathname and get first segment
  const segments = pathname.split('/')
  const firstSegment = segments[1]

  // If URL already has a country code (2-letter code), proceed
  if (firstSegment && firstSegment.length === 2 && /^[a-z]{2}$/.test(firstSegment)) {
    return NextResponse.next()
  }

  // For root path, redirect to /us
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/us', request.url), 307)
  }

  // For other paths without country code, redirect to /us + path
  const redirectUrl = new URL(`/us${pathname}`, request.url)
  return NextResponse.redirect(redirectUrl, 307)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp|admin|frontend).*)',
  ],
}