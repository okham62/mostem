import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { logLogin } from '@/lib/log'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) return null

        const supabase = createAdminClient()
        const { data: user } = await supabase
          .from('users')
          .select('id, email, name, username, image, password_hash, status, role')
          .eq('username', credentials.username as string)
          .single()

        if (!user?.password_hash) return null

        const valid = await bcrypt.compare(credentials.password as string, user.password_hash)
        if (!valid) return null

        if (user.status === 'pending') throw new Error('pending')
        if (user.status === 'rejected') throw new Error('rejected')

        void logLogin(user.id, req as Request)

        return {
          id: user.id,
          email: user.email ?? user.username,
          name: user.name,
          image: user.image ?? null,
          username: user.username,
          status: user.status,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id
        token.status = user.status ?? token.status
        token.role = user.role ?? token.role
        token.name = user.name
        token.username = user.username
        token.picture = user.image ?? undefined
      }
      if (trigger === 'update' && session) {
        const payload = session as { name?: string; image?: string }
        if (typeof payload.name === 'string') token.name = payload.name
        if (typeof payload.image === 'string') token.picture = payload.image
      }
      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.status = token.status as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.role = token.role as any
        session.user.name = token.name as string
        session.user.image = (token.picture as string) || ''
        session.user.username =
          token.username ||
          String(session.user.email || '').replace(/@mostem\.local$/, '')
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
