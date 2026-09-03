import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { EditClient } from './edit-client'
import type { CollectedPost, ConnectedAccount } from '@/types'

export default async function ThreadEditPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { tab?: string }
}) {
  const session = await auth()
  const { id } = params
  const supabase = createAdminClient()

  const [postRes, accountsRes] = await Promise.all([
    supabase
      .from('collected_posts')
      .select('*')
      .eq('id', id)
      .eq('user_id', session!.user.id)
      .single(),
    supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', session!.user.id)
      .eq('platform', 'threads')
      .order('created_at', { ascending: true }),
  ])

  if (!postRes.data) notFound()

  const tab =
    searchParams.tab === 'rewrite' || searchParams.tab === 'publish' || searchParams.tab === 'original'
      ? searchParams.tab
      : 'original'

  return (
    <EditClient
      post={postRes.data as CollectedPost}
      accounts={(accountsRes.data ?? []) as ConnectedAccount[]}
      initialTab={tab}
    />
  )
}
