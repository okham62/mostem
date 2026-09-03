import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('collected_posts')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '게시물을 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({ post: data })
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })

  const supabase = createAdminClient()
  const update: Record<string, unknown> = {}
  if (typeof body.caption === 'string') update.caption = body.caption
  if (typeof body.status === 'string') update.status = body.status
  if (typeof body.collected_by === 'string') update.collected_by = body.collected_by.replace(/^@/, '').toLowerCase()

  const { error } = await supabase
    .from('collected_posts')
    .update(update)
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('collected_posts')
    .delete()
    .eq('id', params.id)
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
