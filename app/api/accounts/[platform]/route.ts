import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  formatHandle,
  isPublishPlatform,
  normalizePublishUsername,
  usernameError,
  validatePublishUsername,
} from '@/lib/publish-accounts'
import { NextResponse } from 'next/server'

function platformFrom(params: { platform: string }) {
  return isPublishPlatform(params.platform) ? params.platform : null
}

export async function GET(
  _req: Request,
  { params }: { params: { platform: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const platform = platformFrom(params)
  if (!platform) return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('platform', platform)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ accounts: data ?? [] })
}

export async function POST(
  req: Request,
  { params }: { params: { platform: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const platform = platformFrom(params)
  if (!platform) return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })

  const body = await req.json().catch(() => null)
  const username = normalizePublishUsername(platform, String(body?.username ?? ''))
  if (!validatePublishUsername(platform, username)) {
    return NextResponse.json({ error: usernameError(platform) }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('connected_accounts')
    .upsert(
      {
        user_id: session.user.id,
        platform,
        username,
        display_name: body?.display_name ?? formatHandle(platform, username),
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

export async function PATCH(
  req: Request,
  { params }: { params: { platform: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const platform = platformFrom(params)
  if (!platform) return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })

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
    .eq('platform', platform)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: Request,
  { params }: { params: { platform: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const platform = platformFrom(params)
  if (!platform) return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('connected_accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)
    .eq('platform', platform)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
