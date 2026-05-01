import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ channelIds: [] })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('platform_connections')
    .select('channel_id')
    .eq('user_id', session.user.id)
    .eq('platform', 'youtube')

  const channelIds = (data ?? []).map((r: { channel_id: string }) => r.channel_id)
  return NextResponse.json({ channelIds })
}
