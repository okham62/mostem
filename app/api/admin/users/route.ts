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

  if (action === 'delete') {
    if (userId === session.user.id) {
      return NextResponse.json({ error: '본인 계정은 삭제할 수 없습니다.' }, { status: 400 })
    }

    const { data: target } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle()
    if (!target) return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 })
    if (target.role === 'admin') {
      return NextResponse.json({ error: '관리자 계정은 삭제할 수 없습니다.' }, { status: 400 })
    }

    const relatedTables = [
      'login_logs',
      'activity_logs',
      'uploads',
      'collected_posts',
      'platform_connections',
      'connected_accounts',
      'description_presets',
      'tag_presets',
      'templates',
    ]
    for (const table of relatedTables) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId)
      if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    const { error } = await supabase.from('users').delete().eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'set-username') {
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: '아이디는 영문/숫자/밑줄(_)만 사용 가능하며 3~20자여야 합니다.' },
        { status: 400 },
      )
    }

    const { data: current } = await supabase
      .from('users')
      .select('id, username, email')
      .eq('id', userId)
      .single()
    if (!current) return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 })

    const { data: taken } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .neq('id', userId)
      .maybeSingle()
    if (taken) {
      return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 })
    }

    const updates: Record<string, string> = { username }
    if (!current.email || String(current.email).endsWith('@mostem.local')) {
      updates.email = `${username}@mostem.local`
    }

    const { error } = await supabase.from('users').update(updates).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, username })
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
