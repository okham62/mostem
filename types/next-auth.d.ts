import type { DefaultSession } from 'next-auth'
import type { UserStatus, UserRole } from '@/types'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      status: UserStatus
      role: UserRole
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    // YouTube tokens are stored per-channel in platform_connections table
  }
}
