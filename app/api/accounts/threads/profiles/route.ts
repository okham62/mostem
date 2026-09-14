import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

type Body = {
  profiles?: Array<{
    username?: string
    displayName?: string | null
    avatarUrl?: string | null
  }>
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Body | null
  const profiles = Array.isArray(body?.profiles) ? body.profiles : []
  if (!profiles.length) {
    return NextResponse.json({ error: 'profiles required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const updated: string[] = []

  for (const profile of profiles.slice(0, 20)) {
    const username = String(profile.username || '')
      .replace(/^@/, '')
      .trim()
      .toLowerCase()
    if (!username) continue

    const patch: Record<string, unknown> = {}
    if (typeof profile.avatarUrl === 'string' && profile.avatarUrl) {
      patch.avatar_url = profile.avatarUrl
    }
    if (typeof profile.displayName === 'string' && profile.displayName.trim()) {
      patch.display_name = profile.displayName.trim()
    }
    if (!Object.keys(patch).length) continue

    let { error } = await supabase
      .from('connected_accounts')
      .update(patch)
      .eq('user_id', session.user.id)
      .eq('platform', 'threads')
      .ilike('username', username)

    // Older DBs may lack avatar_url — retry without it.
    if (error && /avatar_url/i.test(error.message) && 'avatar_url' in patch) {
      const fallback = { ...patch }
      delete fallback.avatar_url
      if (!Object.keys(fallback).length) continue
      const retry = await supabase
        .from('connected_accounts')
        .update(fallback)
        .eq('user_id', session.user.id)
        .eq('platform', 'threads')
        .ilike('username', username)
      error = retry.error
    }

    if (!error) updated.push(username)
  }

  return NextResponse.json({ ok: true, updated })
}
