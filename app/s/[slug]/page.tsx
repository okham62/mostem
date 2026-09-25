import { createAdminClient } from '@/lib/supabase/admin'
import { getShoppingBest } from '@/lib/shopping'
import { toHotdealItems } from '@/lib/hotdeal'
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
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('link_settings')
    .select('hotdeal_name, hotdeal_intro, hotdeal_published')
    .eq('hotdeal_slug', params.slug.toLowerCase())
    .maybeSingle()
  if (!data?.hotdeal_published) return { title: '핫딜 | Mostem' }
  return {
    title: `${data.hotdeal_name || '핫딜'} | Mostem`,
    description: data.hotdeal_intro || '매일 자동으로 채워지는 쿠팡 핫딜',
  }
}

export default async function PublicHotdealPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('link_settings')
    .select('*')
    .eq('hotdeal_slug', params.slug.toLowerCase())
    .maybeSingle()

  if (!data || !data.hotdeal_published) notFound()

  const board = await getShoppingBest()
  const coupang = board.platforms.find((p) => p.id === 'coupang')
  const items = toHotdealItems(
    (coupang?.rising.products ?? []).slice(0, 40),
    (coupang?.popular.products ?? []).slice(0, 40),
  )

  return (
    <HotdealStorefront
      name={data.hotdeal_name || '핫딜'}
      intro={data.hotdeal_intro || ''}
      categories={Array.isArray(data.hotdeal_categories) ? data.hotdeal_categories : []}
      initialTheme={data.hotdeal_theme || 'mostem'}
      initialBg={data.hotdeal_bg || 'dark'}
      items={items}
    />
  )
}
