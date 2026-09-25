import { createAdminClient } from '@/lib/supabase/admin'
import { serveProductImage } from '@/lib/profile-image'
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
  const { data: settings } = await supabase
    .from('link_settings')
    .select('user_id, profile_published')
    .eq('profile_slug', slug)
    .maybeSingle()

  if (!settings?.profile_published) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: link } = await supabase
    .from('tracked_links')
    .select('og_image_url, destination_url')
    .eq('user_id', settings.user_id)
    .eq('prefix', prefix)
    .eq('code', code)
    .maybeSingle()

  if (!link) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const image = await serveProductImage({
    ogImageUrl: link.og_image_url,
    destinationUrl: link.destination_url,
  })
  if (image) return image

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
