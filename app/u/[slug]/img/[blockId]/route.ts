import { createAdminClient } from '@/lib/supabase/admin'
import { isProfileBlockOn, parseShortLink, type ProfileBlock } from '@/lib/links'
import { serveProductImage } from '@/lib/profile-image'
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
  const block = blocks.find((b) => b.id === params.blockId && isProfileBlockOn(b))
  if (!block) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const parsed = parseShortLink(block.url)
  if (parsed) {
    const { data: link } = await supabase
      .from('tracked_links')
      .select('og_image_url, destination_url')
      .eq('user_id', data.user_id)
      .eq('prefix', parsed.prefix)
      .eq('code', parsed.code)
      .maybeSingle()

    const fromLink = await serveProductImage({
      ogImageUrl: link?.og_image_url ?? block.image,
      destinationUrl: link?.destination_url || block.url,
    })
    if (fromLink) return fromLink
  }

  const fromBlock = await serveProductImage({
    ogImageUrl: block.image,
    destinationUrl: block.url,
  })
  if (fromBlock) return fromBlock

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
