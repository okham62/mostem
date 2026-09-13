import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { attachScheduleTimes, readScheduleMap } from '@/lib/schedule-store'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('collected_posts')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('platform', 'threads')
    .order('collected_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const map = await readScheduleMap(session.user.id)
  const posts = attachScheduleTimes(data ?? [], map)

  return NextResponse.json(
    { posts },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
