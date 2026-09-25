import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/auth.config'
import { RESERVED_PROFILE_SLUGS } from '@/lib/links'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const pathname = req.nextUrl.pathname
  const m = pathname.match(/^\/([a-z0-9-]{3,30})$/i)
  if (m) {
    const slug = m[1]!.toLowerCase()
    if (!RESERVED_PROFILE_SLUGS.has(slug)) {
      const url = req.nextUrl.clone()
      url.pathname = `/u/${slug}`
      url.searchParams.set('via', 'simple')
      return NextResponse.rewrite(url)
    }
  }

  if (
    pathname.startsWith('/u/') ||
    pathname.startsWith('/l/') ||
    pathname.startsWith('/s/') ||
    pathname.startsWith('/icon')
  ) {
    return NextResponse.next()
  }

  const onDashboard = authConfig.callbacks?.authorized?.({
    auth: req.auth,
    request: { nextUrl: req.nextUrl },
  } as never)
  if (onDashboard === false) {
    const url = new URL('/login', req.nextUrl)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
