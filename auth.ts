import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { createAdminClient } from '@/lib/supabase/admin'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/youtube',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false

      const supabase = createAdminClient()

      const { data: existingUser } = await supabase
        .from('users')
        .select('id, status')
        .eq('email', user.email)
        .single()

      if (!existingUser) {
        const { error: insertError } = await supabase.from('users').insert({
          email: user.email,
          name: user.name ?? '',
          image: user.image ?? '',
          status: 'pending',
          role: 'user',
        })

        if (insertError) {
          console.error('Insert error:', insertError)
          return false
        }

        return '/register?status=pending'
      }

      if (existingUser.status === 'pending') return '/register?status=pending'
      if (existingUser.status === 'rejected') return '/register?status=rejected'

      return true
    },

    async session({ session, token }) {
      if (session.user?.email) {
        const supabase = createAdminClient()
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, status, role, name, image')
          .eq('email', session.user.email)
          .single()

        if (dbUser) {
          session.user.id = dbUser.id
          session.user.status = dbUser.status
          session.user.role = dbUser.role
        }
      }

      session.user.accessToken = token.accessToken as string | undefined
      return session
    },

    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        return token
      }

      // 토큰 유효하면 그대로 반환 (1분 여유)
      if (Date.now() < (((token.expiresAt as number) ?? 0) * 1000) - 60000) {
        return token
      }

      // 토큰 만료 시 갱신
      if (!token.refreshToken) return token

      try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken as string,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw data

        token.accessToken = data.access_token
        token.expiresAt = Math.floor(Date.now() / 1000 + data.expires_in)
      } catch (e) {
        console.error('Token refresh error:', e)
      }

      return token
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
