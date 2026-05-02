import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const supabase = createAdminClient()
        const { data: user } = await supabase
          .from('users')
          .select('id, email, name, image, password_hash, status')
          .eq('email', credentials.email as string)
          .single()

        if (!user?.password_hash) return null

        const valid = await bcrypt.compare(credentials.password as string, user.password_hash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false

      const supabase = createAdminClient()
      const { data: dbUser } = await supabase
        .from('users')
        .select('status')
        .eq('email', user.email)
        .single()

      if (!dbUser) return false
      if (dbUser.status === 'pending') return '/register?status=pending'
      if (dbUser.status === 'rejected') return '/register?status=rejected'

      return true
    },

    async session({ session }) {
      if (session.user?.email) {
        const supabase = createAdminClient()
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, status, role')
          .eq('email', session.user.email)
          .single()

        if (dbUser) {
          session.user.id = dbUser.id
          session.user.status = dbUser.status
          session.user.role = dbUser.role
        }
      }
      return session
    },

    async jwt({ token }) {
      return token
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
