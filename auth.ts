import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientIP, getLocationFromIP } from '@/lib/geo'
import { parseDevice } from '@/lib/device'

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

        // 로그인 기록 (비동기 - 로그인 속도에 영향 없음)
        const ip = getClientIP(req as Request)
        const ua = (req as Request).headers?.get('user-agent') ?? null
        const device = parseDevice(ua)
        getLocationFromIP(ip).then(location => {
          supabase.from('login_logs').insert({
            user_id: user.id,
            ip,
            city: location.city,
            region: location.region,
            country: location.country,
            ...device,
          }).then(() => {})
        }).catch(() => {})

        return {
          id: user.id,
          email: user.email ?? user.username,
          name: user.name,
          image: user.image ?? null,
          status: user.status,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.status = (user as { status?: string }).status
        token.role = (user as { role?: string }).role
        token.name = user.name
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
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
