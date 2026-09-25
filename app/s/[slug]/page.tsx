import { createAdminClient } from '@/lib/supabase/admin'
import { HOTDEAL_DEMO, HOTDEAL_DEMO_SLUG } from '@/lib/hotdeal'
import { loadTossCredsFromApis, loadTossHotdealItems } from '@/lib/toss-catalog'
import { HotdealStorefront } from '@/components/hotdeal-storefront'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const slug = params.slug.toLowerCase()
  if (slug === HOTDEAL_DEMO_SLUG) {
    return {
      title: `${HOTDEAL_DEMO.name} | Mostem`,
      description: HOTDEAL_DEMO.intro,
    }
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('link_settings')
    .select('hotdeal_name, hotdeal_intro, hotdeal_published')
    .eq('hotdeal_slug', slug)
    .maybeSingle()
  if (!data?.hotdeal_published) return { title: '핫딜 | Mostem' }
  return {
    title: `${data.hotdeal_name || '핫딜'} | Mostem`,
    description: data.hotdeal_intro || '매일 자동으로 채워지는 토스 핫딜',
  }
}

export default async function PublicHotdealPage({
  params,
}: {
  params: { slug: string }
}) {
  const slug = params.slug.toLowerCase()

  if (slug === HOTDEAL_DEMO_SLUG) {
    const items = await loadTossHotdealItems({ slug, creds: loadTossCredsFromApis() })
    return (
      <HotdealStorefront
        name={HOTDEAL_DEMO.name}
        intro={HOTDEAL_DEMO.intro}
        categories={HOTDEAL_DEMO.categories}
        initialTheme={HOTDEAL_DEMO.theme}
        initialBg={HOTDEAL_DEMO.bg}
        initialLayout="auto"
        items={items}
      />
    )
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('link_settings')
    .select('*')
    .eq('hotdeal_slug', slug)
    .maybeSingle()

  if (!data || !data.hotdeal_published) notFound()

  const items = await loadTossHotdealItems({
    slug,
    creds: loadTossCredsFromApis(data.partner_apis),
  })

  return (
    <HotdealStorefront
      name={data.hotdeal_name || '핫딜'}
      intro={data.hotdeal_intro || ''}
      categories={Array.isArray(data.hotdeal_categories) ? data.hotdeal_categories : []}
      initialTheme={data.hotdeal_theme || 'mostem'}
      initialBg={data.hotdeal_bg || 'dark'}
      initialLayout={data.hotdeal_layout || 'auto'}
      items={items}
    />
  )
}
