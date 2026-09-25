import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const slug = params.slug.toLowerCase()
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('link_settings')
    .select('display_name, profile_slug, profile_bio, profile_avatar_url')
    .eq('profile_slug', slug)
    .maybeSingle()

  const name = String(data?.display_name || data?.profile_slug || slug)
  const icon = String(data?.profile_avatar_url || '/icon.png')

  return Response.json(
    {
      name,
      short_name: name.slice(0, 12),
      description: String(data?.profile_bio || `${name} 링크`),
      start_url: `/u/${slug}`,
      scope: `/u/${slug}`,
      display: 'standalone',
      background_color: '#0b0b0d',
      theme_color: '#0b0b0d',
      lang: 'ko',
      icons: [
        {
          src: icon,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=300',
      },
    },
  )
}
