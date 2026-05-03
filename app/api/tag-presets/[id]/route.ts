import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  await supabase
    .from('tag_presets')
    .delete()
    .eq('id', params.id)
    .eq('user_id', session.user.id) // 본인 프리셋만 삭제 가능

  return NextResponse.json({ success: true })
}
