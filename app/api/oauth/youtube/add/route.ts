import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { logActivity } from '@/lib/log'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { channelId, channelName } = await req.json()
  if (!channelId || !channelName) {
    return NextResponse.json({ error: 'Missing channelId or channelName' }, { status: 400 })
  }

  // 쿠키에서 OAuth 토큰 가져오기
  const cookieStore = await cookies()
  const pending = cookieStore.get('yt_oauth_pending')

  if (!pending?.value) {
    return NextResponse.json({ error: 'OAuth 세션이 만료됐습니다. 다시 연결해주세요.' }, { status: 401 })
  }

  let oauthData: { accessToken: string; refreshToken: string | null; expiresAt: number }
  try {
    oauthData = JSON.parse(pending.value)
  } catch {
    return NextResponse.json({ error: 'Invalid OAuth data' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 이미 추가된 채널 확인
  const { data: existing } = await supabase
    .from('platform_connections')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('platform', 'youtube')
    .eq('channel_id', channelId)
    .single()

  if (existing) {
    return NextResponse.json({ error: '이미 추가된 채널입니다.' }, { status: 409 })
  }

  const { error } = await supabase.from('platform_connections').insert({
    user_id: session.user.id,
    platform: 'youtube',
    channel_id: channelId,
    channel_name: channelName,
    access_token: oauthData.accessToken,
    refresh_token: oauthData.refreshToken,
    expires_at: new Date(oauthData.expiresAt * 1000).toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  logActivity(session.user.id, 'youtube_connect', { channelId, channelName }).catch(() => {})

  return NextResponse.json({ success: true })
}
