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
          scope: 'openid email profile',
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
