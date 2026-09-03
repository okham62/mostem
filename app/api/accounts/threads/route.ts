import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

function normalizeUsername(raw: string) {
  return raw.trim().replace(/^@/, '').toLowerCase()
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('platform', 'threads')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ accounts: data ?? [] })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const username = normalizeUsername(String(body?.username ?? ''))
  if (!/^[a-z0-9._]{2,30}$/.test(username)) {
    return NextResponse.json(
      { error: '스레드 아이디는 영문/숫자/점/밑줄 2~30자입니다.' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('connected_accounts')
    .upsert(
      {
        user_id: session.user.id,
        platform: 'threads',
        username,
        display_name: body?.display_name ?? username,
        intro: body?.intro ?? '',
        topics: Array.isArray(body?.topics) ? body.topics : [],
      },
      { onConflict: 'user_id,platform,username' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('connected_accounts')
    .update({
      display_name: body.display_name,
      intro: body.intro,
      topics: Array.isArray(body.topics) ? body.topics : undefined,
    })
    .eq('id', body.id)
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('connected_accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
