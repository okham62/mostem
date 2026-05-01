import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { connectionId } = await req.json()

  const supabase = createAdminClient()
  await supabase
    .from('platform_connections')
    .delete()
    .eq('id', connectionId)
    .eq('user_id', session.user.id)

  return NextResponse.json({ success: true })
}
