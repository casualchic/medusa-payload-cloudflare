import { NextRequest, NextResponse } from 'next/server'

/**
 * Simplified proxy to handle region selection.
 * Uses Node.js runtime (default in Next.js 16).
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
