import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard') ||
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
