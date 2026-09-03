import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ThreadsBoard } from './threads-board'
import type { CollectedPost, ConnectedAccount } from '@/types'

export default async function ThreadsPage() {
  const session = await auth()
  const supabase = createAdminClient()

  const [postsRes, accountsRes] = await Promise.all([
    supabase
      .from('collected_posts')
      .select('*')
      .eq('user_id', session!.user.id)
      .eq('platform', 'threads')
      .order('collected_at', { ascending: false }),
    supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', session!.user.id)
      .eq('platform', 'threads')
      .order('created_at', { ascending: true }),
  ])

  return (
    <ThreadsBoard
      posts={(postsRes.data ?? []) as CollectedPost[]}
      accounts={(accountsRes.data ?? []) as ConnectedAccount[]}
    />
  )
}
