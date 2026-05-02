import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const supabase = createAdminClient()
        const { data: user } = await supabase
          .from('users')
          .select('id, email, name, username, image, password_hash, status')
          .eq('username', credentials.username as string)
          .single()

        if (!user?.password_hash) return null

        const valid = await bcrypt.compare(credentials.password as string, user.password_hash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email ?? user.username,
          name: user.name,
          image: user.image ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.id) return false

      const supabase = createAdminClient()
      const { data: dbUser } = await supabase
        .from('users')
        .select('status')
        .eq('id', user.id)
        .single()

      if (!dbUser) return false
      if (dbUser.status === 'pending') return '/register?status=pending'
      if (dbUser.status === 'rejected') return '/register?status=rejected'

      return true
    },

    async session({ session, token }) {
      if (token?.sub) {
        const supabase = createAdminClient()
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, status, role, name')
          .eq('id', token.sub)
          .single()

        if (dbUser) {
          session.user.id = dbUser.id
          session.user.status = dbUser.status
          session.user.role = dbUser.role
          session.user.name = dbUser.name
        }
      }
      return session
    },

    async jwt({ token, user }) {
      if (user) token.sub = user.id
      return token
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
