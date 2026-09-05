import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { mergeTagHistory, resultsFromStored, TAG_HISTORY_LIMIT, type TagHistoryItem } from '@/lib/tag-history'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, created_at, detail')
    .eq('user_id', session.user.id)
    .eq('action', 'ai_tags')
    .order('created_at', { ascending: false })
    .limit(TAG_HISTORY_LIMIT)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items: TagHistoryItem[] = (data ?? [])
    .map((row) => {
      const detail = (row.detail ?? {}) as {
        topic?: string
        platforms?: Array<{ platform?: string; name?: string; tags?: string[] }>
      }
      const topic = typeof detail.topic === 'string' ? detail.topic.trim() : ''
      if (!topic) return null
      return {
        id: String(row.id),
        topic,
        createdAt: new Date(row.created_at).getTime(),
        platforms: resultsFromStored(detail.platforms, topic),
      } satisfies TagHistoryItem
    })
    .filter((item): item is TagHistoryItem => item != null)

  return NextResponse.json(
    { items: mergeTagHistory(items) },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
