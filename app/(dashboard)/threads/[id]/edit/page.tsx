import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { attachScheduleTimes, readScheduleMap } from '@/lib/schedule-store'
import { fetchThreadsPostMedia, mergeRemoteMedia } from '@/lib/threads-remote-media'
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

  const [postRes, accountsRes, scheduleMap] = await Promise.all([
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
    readScheduleMap(session!.user.id),
  ])

  if (!postRes.data) notFound()

  let post = attachScheduleTimes([postRes.data as CollectedPost], scheduleMap)[0]
  if (post.url) {
    const remote = await fetchThreadsPostMedia(post.url).catch(() => [])
    const merged = mergeRemoteMedia(post, remote)
    if (merged.changed && merged.serialized) {
      await supabase
        .from('collected_posts')
        .update({ media_url: merged.serialized })
        .eq('id', post.id)
        .eq('user_id', session!.user.id)
      post = { ...post, media_url: merged.serialized }
    }
  }

  const tab =
    searchParams.tab === 'rewrite' || searchParams.tab === 'publish' || searchParams.tab === 'original'
      ? searchParams.tab
      : 'original'

  return (
    <EditClient
      post={post}
      accounts={(accountsRes.data ?? []) as ConnectedAccount[]}
      initialTab={tab}
      isAdmin={session?.user?.role === 'admin'}
    />
  )
}
