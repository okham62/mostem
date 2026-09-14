import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { attachScheduleTimes, readScheduleMap } from '@/lib/schedule-store'
import { ThreadsBoard } from './threads-board'
import type { CollectedPost, ConnectedAccount } from '@/types'

export default async function ThreadsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const supabase = createAdminClient()

  const [postsRes, accountsRes, scheduleMap] = await Promise.all([
    supabase
      .from('collected_posts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('platform', 'threads')
      .order('collected_at', { ascending: false }),
    supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('platform', 'threads')
      .order('created_at', { ascending: true }),
    readScheduleMap(session.user.id),
  ])

  const posts = attachScheduleTimes(
    (postsRes.data ?? []) as CollectedPost[],
    scheduleMap,
  )

  return (
    <Suspense fallback={<div className="p-6 text-sm text-white/40">불러오는 중…</div>}>
      <ThreadsBoard
        posts={posts}
        accounts={(accountsRes.data ?? []) as ConnectedAccount[]}
      />
    </Suspense>
  )
}
