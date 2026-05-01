import type { DefaultSession } from 'next-auth'
import type { UserStatus, UserRole } from '@/types'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      status: UserStatus
      role: UserRole
      accessToken?: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
  }
}
