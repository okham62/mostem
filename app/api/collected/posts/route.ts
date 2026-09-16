import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { attachScheduleTimes, readScheduleMap } from '@/lib/schedule-store'
import type { CollectPlatform } from '@/types'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ALLOWED: CollectPlatform[] = ['instagram', 'threads', 'tiktok', 'douyin', 'xiaohongshu']

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const platform = new URL(req.url).searchParams.get('platform') || 'threads'
  if (!ALLOWED.includes(platform as CollectPlatform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('collected_posts')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('platform', platform)
    .order('collected_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const map = await readScheduleMap(session.user.id)
  const posts = attachScheduleTimes(data ?? [], map)

  return NextResponse.json({ posts }, { headers: { 'Cache-Control': 'no-store' } })
}
