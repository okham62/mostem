import { createAdminClient } from '@/lib/supabase/admin'
import { MostemLogo } from '@/components/mostem-logo'
import type { ProfileBlock } from '@/lib/links'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PublicProfilePage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('link_settings')
    .select('*')
    .eq('profile_slug', params.slug.toLowerCase())
    .maybeSingle()

  if (!data) notFound()

  const blocks = (Array.isArray(data.profile_blocks) ? data.profile_blocks : []) as ProfileBlock[]
  const live = blocks.filter((b) => b.url && !b.archived)
  const name = data.display_name || data.profile_slug || 'Mostem'

  return (
    <div className="min-h-screen bg-[#0b0b0d] px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--gold)]/15 ring-2 ring-[var(--gold)]/40">
          <MostemLogo size={48} rounded="full" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold">{name}</h1>
          <p className="mt-1 text-xs text-white/40">이 포스팅은 쿠팡 파트너스 등의 활동의 수수료를 제공받을 수 있습니다.</p>
        </div>

        {live.length === 0 ? (
          <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/45">
            아직 공개된 링크가 없어요
            <p className="mt-1 text-xs text-white/30">곧 새로운 추천을 채워넣을게요</p>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3">
            {live.map((b) => (
              <a
                key={b.id}
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-center text-sm font-medium transition hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/10"
              >
                {b.title || b.url}
              </a>
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center gap-2 text-xs text-white/30">
          <MostemLogo size={18} rounded="lg" />
          Mostem
        </div>
      </div>
    </div>
  )
}
