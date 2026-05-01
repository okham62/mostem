import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  return NextResponse.json({
    hasSession: !!session,
    hasUser: !!session?.user,
    hasAccessToken: !!session?.user?.accessToken,
    accessTokenPreview: session?.user?.accessToken?.slice(0, 20) + '...',
  })
}
