import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const { name, email, password } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: '모든 항목을 입력해주세요.' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 중복 이메일 확인
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 })
  }

  const password_hash = await bcrypt.hash(password, 12)

  const { error } = await supabase.from('users').insert({
    name,
    email,
    password_hash,
    image: '',
    status: 'pending',
    role: 'user',
  })

  if (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: '회원가입에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
