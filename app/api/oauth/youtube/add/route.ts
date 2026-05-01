import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { channelId, channelName } = await req.json()
  if (!channelId || !channelName) {
    return NextResponse.json({ error: 'Missing channelId or channelName' }, { status: 400 })
  }

  const accessToken = session.user.accessToken
  if (!accessToken) return NextResponse.json({ error: 'No access token' }, { status: 401 })

  const supabase = createAdminClient()

  // 이미 추가된 채널인지 확인
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
    access_token: accessToken,
    channel_name: channelName,
    channel_id: channelId,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
