import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, name, username, image')
    .eq('id', session.user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: '프로필을 불러오지 못했습니다.' }, { status: 500 })
  return NextResponse.json({
    id: data.id,
    name: data.name ?? '',
    username: data.username ?? '',
    image: data.image ?? '',
  })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const updates: Record<string, string> = {}

  if (typeof body?.name === 'string') {
    const name = body.name.trim()
    if (name.length < 1 || name.length > 30) {
      return NextResponse.json({ error: '이름은 1~30자로 입력하세요.' }, { status: 400 })
    }
    updates.name = name
  }

  if (typeof body?.image === 'string') {
    if (body.image && !body.image.startsWith('data:image/')) {
      return NextResponse.json({ error: '이미지 형식이 올바르지 않습니다.' }, { status: 400 })
    }
    if (body.image.length > 450_000) {
      return NextResponse.json({ error: '이미지가 너무 큽니다. 더 작은 사진을 선택하세요.' }, { status: 400 })
    }
    updates.image = body.image
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '변경할 내용이 없습니다.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('users').update(updates).eq('id', session.user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ...updates })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

  if (newPassword.length < 8) {
    return NextResponse.json({ error: '새 비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
  }
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: '현재 비밀번호와 다른 비밀번호를 입력하세요.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: user } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', session.user.id)
    .single()

  if (!user?.password_hash) {
    return NextResponse.json({ error: '계정을 확인할 수 없습니다.' }, { status: 400 })
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(newPassword, 12)
  const { error } = await supabase.from('users').update({ password_hash }).eq('id', session.user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
