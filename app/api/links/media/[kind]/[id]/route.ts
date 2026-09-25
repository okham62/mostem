import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { serveProductImage } from '@/lib/profile-image'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { kind: string; id: string } },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const kind = params.kind
  const id = params.id
  const supabase = createAdminClient()

  if (kind === 'link') {
    const { data } = await supabase
      .from('tracked_links')
      .select('og_image_url, destination_url')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const image = await serveProductImage({
      ogImageUrl: data.og_image_url,
      destinationUrl: data.destination_url,
    })
    return image || NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (kind === 'avatar' || kind === 'cover') {
    const column = kind === 'avatar' ? 'profile_avatar_url' : 'profile_cover_url'
    const { data } = await supabase
      .from('link_settings')
      .select(column)
      .eq('user_id', session.user.id)
      .maybeSingle()
    const raw = data ? String((data as Record<string, unknown>)[column] || '') : ''
    const image = await serveProductImage({ ogImageUrl: raw })
    return image || NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
