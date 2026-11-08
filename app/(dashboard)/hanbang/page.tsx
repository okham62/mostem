import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { HANBANG_PLATFORMS, hanbangReady, type HanbangPlatformId } from '@/lib/hanbang-platforms'
import { HanbangBoard, type HanbangChannel } from './hanbang-board'

export default async function HanbangPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('platform_connections')
    .select('id, platform, channel_id, channel_name')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true })

  const ready = Object.fromEntries(
    HANBANG_PLATFORMS.map((platform) => [platform.id, hanbangReady(platform.id)])
  ) as Record<HanbangPlatformId, boolean>

  return <HanbangBoard channels={(data ?? []) as HanbangChannel[]} ready={ready} />
}
