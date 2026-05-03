import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, content } = await req.json()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('description_presets')
    .update({ name, content })
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ preset: data })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  await supabase
    .from('description_presets')
    .delete()
    .eq('id', params.id)
    .eq('user_id', session.user.id)

  return NextResponse.json({ success: true })
}
