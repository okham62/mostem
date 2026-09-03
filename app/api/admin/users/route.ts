import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

function tempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let value = 'mostem-'
  for (let i = 0; i < 8; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)]
  }
  return value
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const userId = body?.userId
  const action = body?.action
  if (!userId || typeof action !== 'string') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (action === 'approve' || action === 'reject') {
    const { error } = await supabase
      .from('users')
      .update({ status: action === 'approve' ? 'approved' : 'rejected' })
      .eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'set-password' || action === 'reset-password') {
    const nextPassword =
      action === 'reset-password'
        ? tempPassword()
        : typeof body.password === 'string'
          ? body.password.trim()
          : ''
    if (nextPassword.length < 8) {
      return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
    }

    const password_hash = await bcrypt.hash(nextPassword, 12)
    const { error } = await supabase
      .from('users')
      .update({ password_hash })
      .eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      password: action === 'reset-password' ? nextPassword : undefined,
    })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
