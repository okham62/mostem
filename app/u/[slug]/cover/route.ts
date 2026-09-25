import { getProfileBySlug } from '@/lib/profile-query'
import { serveProductImage } from '@/lib/profile-image'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const settings = await getProfileBySlug(params.slug.toLowerCase())
  if (!settings?.profile_published || !settings.profile_cover_url) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const image = await serveProductImage({ ogImageUrl: settings.profile_cover_url })
  return image || NextResponse.json({ error: 'Not found' }, { status: 404 })
}
