import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', BASE_URL))
  }

  const accessToken = session.user.accessToken
  if (!accessToken) {
    return NextResponse.redirect(new URL('/accounts?error=no_token', BASE_URL))
  }

  // YouTube 채널 정보 가져오기
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  const data = await res.json()

  // API 에러 확인
  if (!res.ok) {
    const code = data?.error?.code || res.status
    const msg = data?.error?.message || 'unknown'
    console.error('YouTube API error:', code, msg)
    return NextResponse.redirect(new URL(`/accounts?error=api_${code}`, BASE_URL))
  }

  const channel = data.items?.[0]

  if (!channel) {
    console.error('No YouTube channel found. Response:', JSON.stringify(data))
    return NextResponse.redirect(new URL('/accounts?error=no_channel', BASE_URL))
  }

  const supabase = createAdminClient()
  await supabase.from('platform_connections').upsert(
    {
      user_id: session.user.id,
      platform: 'youtube',
      access_token: accessToken,
      channel_name: channel.snippet.title,
      channel_id: channel.id,
    },
    { onConflict: 'user_id,platform' }
  )

  return NextResponse.redirect(new URL('/accounts', BASE_URL))
}
