import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard =
        nextUrl.pathname.startsWith('/dashboard') ||
        nextUrl.pathname.startsWith('/keywords') ||
        nextUrl.pathname.startsWith('/news') ||
        nextUrl.pathname.startsWith('/trends') ||
        nextUrl.pathname.startsWith('/shopping') ||
        nextUrl.pathname.startsWith('/products') ||
        nextUrl.pathname.startsWith('/threads') ||
        nextUrl.pathname.startsWith('/instagram') ||
        nextUrl.pathname.startsWith('/blog') ||
        nextUrl.pathname.startsWith('/compose') ||
        nextUrl.pathname.startsWith('/ai') ||
        nextUrl.pathname.startsWith('/calendar') ||
        nextUrl.pathname.startsWith('/links') ||
        nextUrl.pathname.startsWith('/profit') ||
        nextUrl.pathname.startsWith('/challenge') ||
        nextUrl.pathname.startsWith('/ranking') ||
        nextUrl.pathname.startsWith('/settings') ||
        nextUrl.pathname.startsWith('/upload') ||
        nextUrl.pathname.startsWith('/history') ||
        nextUrl.pathname.startsWith('/accounts') ||
        nextUrl.pathname.startsWith('/admin')

      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false
      }

      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
