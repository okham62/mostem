import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { attachScheduleTimes, readScheduleMap } from '@/lib/schedule-store'
import { fetchThreadsPostMedia, mergeRemoteMedia } from '@/lib/threads-remote-media'
import { redirect } from 'next/navigation'
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
  if (!session?.user?.id) redirect('/login')

  const { id } = params
  const supabase = createAdminClient()

  const [postRes, accountsRes, scheduleMap] = await Promise.all([
    supabase
      .from('collected_posts')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .maybeSingle(),
    supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('platform', 'threads')
      .order('created_at', { ascending: true }),
    readScheduleMap(session.user.id),
  ])

  // Missing/deleted posts used to call notFound() and leave the dashboard on a 404
  // that soft-nav from the sidebar sometimes failed to leave. Bounce to the list.
  if (!postRes.data) redirect('/threads')

  let post = attachScheduleTimes([postRes.data as CollectedPost], scheduleMap)[0]
  if (post.url) {
    const remote = await fetchThreadsPostMedia(post.url).catch(() => [])
    const merged = mergeRemoteMedia(post, remote)
    if (merged.changed && merged.serialized) {
      await supabase
        .from('collected_posts')
        .update({ media_url: merged.serialized })
        .eq('id', post.id)
        .eq('user_id', session.user.id)
      post = { ...post, media_url: merged.serialized }
    }
  }

  const tab = searchParams.tab === 'rewrite' ? 'rewrite' : 'original'

  return (
    <EditClient
      post={post}
      accounts={(accountsRes.data ?? []) as ConnectedAccount[]}
      initialTab={tab}
      openPublish={searchParams.tab === 'publish'}
      isAdmin={session.user.role === 'admin'}
    />
  )
}
