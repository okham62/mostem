import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessToken = session.user.accessToken
  if (!accessToken) return NextResponse.json({ error: 'No access token' }, { status: 401 })

  // 내 채널 + 브랜드 계정 채널 모두 가져오기
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true&maxResults=50',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json({ error: data?.error?.message || 'YouTube API error' }, { status: res.status })
  }

  const channels = (data.items ?? []).map((ch: {
    id: string
    snippet: { title: string; description: string; thumbnails?: { default?: { url: string } } }
    statistics?: { subscriberCount?: string; videoCount?: string }
  }) => ({
    id: ch.id,
    name: ch.snippet.title,
    thumbnail: ch.snippet.thumbnails?.default?.url ?? '',
    subscribers: ch.statistics?.subscriberCount ?? '0',
    videoCount: ch.statistics?.videoCount ?? '0',
  }))

  return NextResponse.json({ channels })
}
