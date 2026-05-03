import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/log'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { videoId, title, description, tags, videoType } = await req.json()
  if (!videoId || !title) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
  const supabase = createAdminClient()

  await supabase.from('uploads').insert({
    user_id: session.user.id,
    title,
    description: description || '',
    tags: tags || [],
    type: videoType || 'short',
    platforms: ['youtube'],
    status: 'completed',
    platform_statuses: { youtube: 'completed' },
    platform_urls: { youtube: videoUrl },
  })

  logActivity(session.user.id, 'youtube_upload', { title, videoId, videoUrl }).catch(() => {})

  return NextResponse.json({ success: true, videoId, videoUrl })
}
