import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/log'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, tags, videoType, channels } = await req.json()
  if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 })

  // channels: [{ channelName: string, videoUrl: string }]
  const channelList: { channelName: string; videoUrl: string }[] = channels ?? []

  // platform_urls: { "채널명": "url", ... }
  const platformUrls: Record<string, string> = {}
  const platformStatuses: Record<string, string> = {}
  channelList.forEach(({ channelName, videoUrl }) => {
    platformUrls[channelName] = videoUrl
    platformStatuses[channelName] = 'completed'
  })

  const supabase = createAdminClient()
  const { error } = await supabase.from('uploads').insert({
    user_id: session.user.id,
    title,
    description: description || '',
    tags: tags || [],
    type: videoType || 'short',
    platforms: ['youtube'],
    status: 'completed',
    platform_statuses: platformStatuses,
    platform_urls: platformUrls,
  })

  if (error) {
    console.error('save-upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  logActivity(session.user.id, 'youtube_upload', { title, channels: channelList }).catch(() => {})

  return NextResponse.json({ success: true })
}
