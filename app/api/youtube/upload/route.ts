import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const maxDuration = 300

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessToken = session.user.accessToken
  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 401 })
  }

  const formData = await req.formData()
  const video = formData.get('video') as File
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || ''
  const tags = JSON.parse((formData.get('tags') as string) || '[]') as string[]
  const visibility = (formData.get('visibility') as string) || 'public'

  if (!video || !title) {
    return NextResponse.json({ error: 'Missing video or title' }, { status: 400 })
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
  const supabase = createAdminClient()
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

  return NextResponse.json({ success: true, videoId, videoUrl })
}
