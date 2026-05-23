import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const { pathname } = request.nextUrl

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // domain.mad.onl → rewrite to /domain-site/* internally
  if (hostname.startsWith('domain.')) {
    const url = request.nextUrl.clone()
    url.pathname = '/domain-site' + (pathname === '/' ? '' : pathname)
    return NextResponse.rewrite(url)
  }

  // foretagsnamn.mad.onl and everything else → pass through unchanged
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
