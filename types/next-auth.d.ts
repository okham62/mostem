import type { DefaultSession } from 'next-auth'
import type { UserStatus, UserRole } from '@/types'

declare module 'next-auth' {
  interface User {
    username?: string
    status?: UserStatus
    role?: UserRole
  }

  interface Session {
    user: {
      id: string
      username?: string
      status: UserStatus
      role: UserRole
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username?: string
    status?: string
    role?: string
  }
}
