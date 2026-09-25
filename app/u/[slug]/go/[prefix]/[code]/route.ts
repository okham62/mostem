import { createAdminClient } from '@/lib/supabase/admin'
import { isProfileBlockOn, parseShortLink, type ProfileBlock } from '@/lib/links'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { slug: string; prefix: string; code: string } },
) {
  const slug = params.slug.toLowerCase()
  const prefix = params.prefix.toLowerCase()
  const code = params.code.toLowerCase()
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('link_settings')
    .select('user_id, profile_published, profile_blocks')
    .eq('profile_slug', slug)
    .maybeSingle()

  if (!data?.profile_published) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: link } = await supabase
    .from('tracked_links')
    .select('id, destination_url, click_count')
    .eq('user_id', data.user_id)
    .eq('prefix', prefix)
    .eq('code', code)
    .maybeSingle()

  if (!link?.destination_url) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const blocks = (Array.isArray(data.profile_blocks) ? data.profile_blocks : []) as ProfileBlock[]
  const block = blocks.find((b) => {
    if (!isProfileBlockOn(b)) return false
    const parsed = parseShortLink(b.url)
    return parsed?.prefix === prefix && parsed?.code === code
  })

  await supabase.from('profile_events').insert({
    user_id: data.user_id,
    slug,
    kind: 'click',
    block_id: block?.id || `l:${prefix}:${code}`,
    visitor_key: null,
  })

  void supabase
    .from('tracked_links')
    .update({ click_count: (link.click_count ?? 0) + 1 })
    .eq('id', link.id)

  return NextResponse.redirect(link.destination_url, 302)
}
