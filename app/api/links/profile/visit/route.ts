import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Public ingest for profile page views / block clicks. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      slug?: string
      kind?: 'view' | 'click'
      blockId?: string | null
      visitorKey?: string | null
    }
    const slug = (body.slug || '').trim().toLowerCase()
    const kind = body.kind === 'click' ? 'click' : 'view'
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

    const supabase = createAdminClient()
    const { data: settings } = await supabase
      .from('link_settings')
      .select('user_id, profile_published, profile_simple_address, profile_slug')
      .eq('profile_slug', slug)
      .maybeSingle()

    if (!settings?.user_id || !settings.profile_published) {
      return NextResponse.json({ ok: false }, { status: 404 })
    }

    const visitorKey = (body.visitorKey || '').trim().slice(0, 80) || null

    if (kind === 'view' && visitorKey) {
      const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const { data: recent } = await supabase
        .from('profile_events')
        .select('id')
        .eq('user_id', settings.user_id)
        .eq('kind', 'view')
        .eq('visitor_key', visitorKey)
        .gte('created_at', since)
        .limit(1)
        .maybeSingle()
      if (recent) return NextResponse.json({ ok: true, deduped: true })
    }

    const { error } = await supabase.from('profile_events').insert({
      user_id: settings.user_id,
      slug,
      kind,
      block_id: kind === 'click' ? body.blockId || null : null,
      visitor_key: visitorKey,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'failed' },
      { status: 400 },
    )
  }
}
