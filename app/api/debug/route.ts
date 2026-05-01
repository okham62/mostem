import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ hasSession: false })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('platform_connections')
    .select('platform, channel_name, channel_id, expires_at')
    .eq('user_id', session.user.id)

  return NextResponse.json({
    hasSession: true,
    userId: session.user.id,
    email: session.user.email,
    connectedChannels: data ?? [],
  })
}
