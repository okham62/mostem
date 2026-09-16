import { createAdminClient } from '@/lib/supabase/admin'
import { getShoppingBest } from '@/lib/shopping'
import { MostemLogo } from '@/components/mostem-logo'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
  const products = [
    ...(coupang?.rising.products ?? []).slice(0, 12),
    ...(coupang?.popular.products ?? []).slice(0, 12),
  ].slice(0, 24)

  const dark = data.hotdeal_bg !== 'light'

  return (
    <div className={dark ? 'min-h-screen bg-[#0b0b0d] text-white' : 'min-h-screen bg-[#f4f5f8] text-[#14161c]'}>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">{data.hotdeal_name || '핫딜'}</h1>
          {data.hotdeal_intro ? (
            <p className={`mt-2 text-sm ${dark ? 'text-white/50' : 'text-black/50'}`}>{data.hotdeal_intro}</p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((p) => (
            <a
              key={`${p.rank}-${p.title}`}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex gap-3 rounded-2xl border p-3 transition ${
                dark
                  ? 'border-white/10 bg-white/[0.04] hover:border-[var(--accent)]/40'
                  : 'border-black/10 bg-white hover:border-[var(--accent)]/40'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt="" className="h-16 w-16 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium">{p.title}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--accent)]">{p.priceText}</p>
              </div>
            </a>
          ))}
        </div>

        <div className={`mt-10 flex items-center justify-center gap-2 text-xs ${dark ? 'text-white/30' : 'text-black/30'}`}>
          <MostemLogo size={18} rounded="lg" />
          Mostem 핫딜
        </div>
      </div>
    </div>
  )
}
