import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/log'

export const maxDuration = 300

async function getValidAccessToken(connection: {
  id: string
  access_token: string
  refresh_token: string | null
  expires_at: number | null
}): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000)

  // 토큰이 아직 유효하면 그대로 사용
  if (connection.expires_at && connection.expires_at > now + 60) {
    return connection.access_token
  }

  // refresh_token이 없으면 재인증 필요
  if (!connection.refresh_token) return null

  // 토큰 갱신
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

  // DB에 새 토큰 저장
  const supabase = createAdminClient()
  await supabase
    .from('platform_connections')
    .update({
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    })
    .eq('id', connection.id)

  return data.access_token
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const video = formData.get('video') as File
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || ''
  const tags = JSON.parse((formData.get('tags') as string) || '[]') as string[]
  const visibility = (formData.get('visibility') as string) || 'public'
  const channelId = formData.get('channelId') as string | null

  if (!video || !title) {
    return NextResponse.json({ error: 'Missing video or title' }, { status: 400 })
  }

  // platform_connections에서 채널 토큰 가져오기
  const supabase = createAdminClient()
  const query = supabase
    .from('platform_connections')
    .select('id, access_token, refresh_token, expires_at, channel_id')
    .eq('user_id', session.user.id)
    .eq('platform', 'youtube')

  if (channelId) {
    query.eq('channel_id', channelId)
  }

  const { data: connections } = await query.limit(1).single()

  if (!connections) {
    return NextResponse.json({ error: 'YouTube 채널이 연결되지 않았습니다.' }, { status: 401 })
  }

  const accessToken = await getValidAccessToken(connections)
  if (!accessToken) {
    return NextResponse.json({ error: 'YouTube 인증이 만료됐습니다. 채널을 다시 연결해주세요.' }, { status: 401 })
  }

  // YouTube 업로드 세션 시작
  const initiateRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': video.type || 'video/mp4',
        'X-Upload-Content-Length': video.size.toString(),
      },
      body: JSON.stringify({
        snippet: { title, description, tags },
        status: { privacyStatus: visibility },
      }),
    }
  )

  if (!initiateRes.ok) {
    const err = await initiateRes.json()
    console.error('YouTube initiate error:', err)
    return NextResponse.json({ error: 'YouTube 업로드 시작 실패' }, { status: 500 })
  }

  const uploadUrl = initiateRes.headers.get('location')
  if (!uploadUrl) {
    return NextResponse.json({ error: 'Upload URL 없음' }, { status: 500 })
  }

  // YouTube에 영상 업로드
  const videoBuffer = await video.arrayBuffer()
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': video.type || 'video/mp4',
      'Content-Length': video.size.toString(),
    },
    body: videoBuffer,
  })

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}))
    console.error('YouTube upload error:', err)
    return NextResponse.json({ error: 'YouTube 업로드 실패' }, { status: 500 })
  }

  const videoData = await uploadRes.json()
  const videoId = videoData.id
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

  // DB에 업로드 기록 저장
  await supabase.from('uploads').insert({
    user_id: session.user.id,
    title,
    description,
    tags,
    type: (formData.get('type') as string) || 'short',
    platforms: ['youtube'],
    status: 'completed',
    platform_statuses: { youtube: 'completed' },
    platform_urls: { youtube: videoUrl },
  })

  logActivity(session.user.id, 'youtube_upload', { title, videoId, videoUrl }).catch(() => {})

  return NextResponse.json({ success: true, videoId, videoUrl })
}
