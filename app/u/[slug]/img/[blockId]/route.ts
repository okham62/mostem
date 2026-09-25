import { createAdminClient } from '@/lib/supabase/admin'
import { findTrackedLinkForBlock, isProfileBlockOn, type ProfileBlock } from '@/lib/links'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function dataUrlToResponse(raw: string) {
  const m = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/)
  if (!m) return null
  const bytes = Buffer.from(m[2], 'base64')
  if (!bytes.byteLength) return null
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': m[1],
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

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
  const block = blocks.find((b) => b.id === params.blockId && isProfileBlockOn(b))
  if (!block) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const stored = String(block.image || '').trim()
  if (/^https?:\/\//i.test(stored)) {
    return NextResponse.redirect(stored, 302)
  }
  const fromBlock = stored.startsWith('data:image') ? dataUrlToResponse(stored) : null
  if (fromBlock) return fromBlock

  const { data: links } = await supabase
    .from('tracked_links')
    .select('prefix, code, destination_url, og_image_url')
    .eq('user_id', data.user_id)

  const hit = findTrackedLinkForBlock(block, links ?? [])
  const og = String(hit?.og_image_url || '').trim()
  if (/^https?:\/\//i.test(og)) {
    return NextResponse.redirect(og, 302)
  }
  const fromLink = og.startsWith('data:image') ? dataUrlToResponse(og) : null
  if (fromLink) return fromLink

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
