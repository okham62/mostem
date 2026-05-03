import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function getValidAccessToken(connection: {
  id: string
  access_token: string
  refresh_token: string | null
  expires_at: string | number | null
}): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000)
  const expiresAtUnix = connection.expires_at
    ? typeof connection.expires_at === 'string'
      ? Math.floor(new Date(connection.expires_at).getTime() / 1000)
      : connection.expires_at
    : null

  if (expiresAtUnix && expiresAtUnix > now + 60) return connection.access_token
  if (!connection.refresh_token) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  const data = await res.json()
  if (!data.access_token) return null

  const supabase = createAdminClient()
  await supabase.from('platform_connections').update({
    access_token: data.access_token,
    expires_at: new Date((Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600)) * 1000).toISOString(),
  }).eq('id', connection.id)

  return data.access_token
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, tags, visibility, channelId, fileSize, fileType } = await req.json()
  if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 })

  const supabase = createAdminClient()
  let query = supabase
    .from('platform_connections')
    .select('id, access_token, refresh_token, expires_at')
    .eq('user_id', session.user.id)
    .eq('platform', 'youtube')

  if (channelId) query = query.eq('channel_id', channelId)

  const { data: connection } = await query.limit(1).single()
  if (!connection) return NextResponse.json({ error: 'YouTube 채널이 연결되지 않았습니다.' }, { status: 401 })

  const accessToken = await getValidAccessToken(connection)
  if (!accessToken) return NextResponse.json({ error: 'YouTube 인증이 만료됐습니다. 채널을 다시 연결해주세요.' }, { status: 401 })

  const initiateRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': fileType || 'video/mp4',
        'X-Upload-Content-Length': String(fileSize || 0),
      },
      body: JSON.stringify({
        snippet: { title, description: description || '', tags: tags || [] },
        status: { privacyStatus: visibility || 'public' },
      }),
    }
  )

  if (!initiateRes.ok) {
    const err = await initiateRes.json().catch(() => ({}))
    const reason = err?.error?.errors?.[0]?.reason || err?.error?.message || initiateRes.statusText
    return NextResponse.json({ error: `YouTube 오류: ${reason}` }, { status: 500 })
  }

  const uploadUrl = initiateRes.headers.get('location')
  if (!uploadUrl) return NextResponse.json({ error: 'Upload URL을 받지 못했습니다.' }, { status: 500 })

  return NextResponse.json({ uploadUrl })
}
