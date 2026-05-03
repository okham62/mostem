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

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('id, access_token, refresh_token, expires_at')
    .eq('user_id', session.user.id)
    .eq('platform', 'youtube')
    .limit(1)
    .single()

  if (!connection) return NextResponse.json({ error: 'No connection' }, { status: 401 })

  const accessToken = await getValidAccessToken(connection)
  if (!accessToken) return NextResponse.json({ error: 'Token expired' }, { status: 401 })

  // 1단계: 채널의 업로드 재생목록 ID 가져오기 (업로드 즉시 반영)
  const channelRes = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const channelData = await channelRes.json()
  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads

  if (!uploadsPlaylistId) {
    return NextResponse.json({ videoId: null, error: '업로드 재생목록을 찾을 수 없음' })
  }

  // 2단계: 업로드 재생목록에서 최신 영상 가져오기
  const playlistRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const playlistData = await playlistRes.json()
  const videoId = playlistData.items?.[0]?.snippet?.resourceId?.videoId ?? null

  return NextResponse.json({ videoId })
}
