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
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
