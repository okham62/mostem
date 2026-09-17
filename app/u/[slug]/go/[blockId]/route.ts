import { createAdminClient } from '@/lib/supabase/admin'
import type { ProfileBlock } from '@/lib/links'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { slug: string; blockId: string } },
) {
  const slug = params.slug.toLowerCase()
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('link_settings')
    .select('user_id, profile_published, profile_blocks')
    .eq('profile_slug', slug)
    .maybeSingle()

  if (!data?.profile_published) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const blocks = (Array.isArray(data.profile_blocks) ? data.profile_blocks : []) as ProfileBlock[]
  const block = blocks.find((b) => b.id === params.blockId && b.url && !b.archived)
  if (!block?.url) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await supabase.from('profile_events').insert({
    user_id: data.user_id,
    slug,
    kind: 'click',
    block_id: block.id,
    visitor_key: null,
  })

  return NextResponse.redirect(block.url, 302)
}
