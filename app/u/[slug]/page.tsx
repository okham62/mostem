import { createAdminClient } from '@/lib/supabase/admin'
import { MostemLogo } from '@/components/mostem-logo'
import {
  normalizeLinkSettings,
  type ProfileBlock,
  type ProfileSnsLink,
} from '@/lib/links'
import { notFound } from 'next/navigation'
import { ProfilePublicClient } from './profile-public-client'

export const dynamic = 'force-dynamic'

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { via?: string }
}) {
  const slug = params.slug.toLowerCase()
  const viaSimple = searchParams?.via === 'simple'
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('link_settings')
    .select('*')
    .eq('profile_slug', slug)
    .maybeSingle()

  if (!data) notFound()

  const settings = normalizeLinkSettings(data as Record<string, unknown>)
  if (!settings.profile_published) notFound()
  if (viaSimple && !settings.profile_simple_address) notFound()

  const blocks = settings.profile_blocks.filter((b) => b.url && !b.archived)
  const name = settings.display_name || settings.profile_slug || 'Mostem'
  const bio = settings.profile_bio || ''
  const layout = settings.profile_layout || 'cover'
  const fontSize = settings.profile_font_size || 'md'
  const avatarUrl = settings.profile_avatar_url
  const coverUrl = settings.profile_cover_url
  const sns = settings.profile_sns as ProfileSnsLink[]
  const font = fontSize === 'sm' ? 'text-lg' : fontSize === 'lg' ? 'text-3xl' : 'text-2xl'
  const coverH = layout === 'full-cover' ? 'h-48' : layout === 'profile' ? 'h-0' : 'h-36'

  return (
    <div className="min-h-screen bg-[#0b0b0d] px-4 py-8 text-white">
      <ProfilePublicClient slug={slug} />
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#121214] shadow-2xl">
        <div className="bg-[#5b3cc4] px-4 py-2.5 text-[11px] leading-relaxed text-white/90">
          본 페이지의 일부 링크는 쿠팡 파트너스 활동을 통해 일정액의 수수료를 제공받습니다.
          <br />
          본 페이지의 일부 링크는 네이버쇼핑 커넥트 활동을 통해 일정액의 수수료를 제공받습니다.
        </div>

        {layout !== 'profile' ? (
          <div
            className={`relative ${coverH} bg-gradient-to-br from-amber-700/40 to-amber-900/30`}
            style={
              coverUrl
                ? {
                    backgroundImage: `url(${coverUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          >
            <div className="absolute inset-x-0 -bottom-10 flex justify-center">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-20 w-20 rounded-full object-cover ring-4 ring-[#121214]"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--gold)]/20 ring-4 ring-[#121214]">
                  <MostemLogo size={44} rounded="full" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex justify-center pt-8">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <MostemLogo size={72} rounded="full" />
            )}
          </div>
        )}

        <div className={`px-5 pb-8 ${layout !== 'profile' ? 'pt-14' : 'pt-4'} text-center`}>
          <h1 className={`font-bold ${font}`}>{name}</h1>
          {bio ? <p className="mt-2 text-sm text-white/50">{bio}</p> : null}

          {sns.length > 0 ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {sns.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/15"
                >
                  {s.label || 'SNS'}
                </a>
              ))}
            </div>
          ) : null}

          {blocks.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-white/15 px-4 py-10 text-sm text-white/45">
              아직 공개된 링크가 없어요
              <p className="mt-1 text-xs text-white/30">곧 새로운 추천을 채워둘게요.</p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-3">
              {blocks.map((b: ProfileBlock) => (
                <a
                  key={b.id}
                  href={`/u/${slug}/go/${encodeURIComponent(b.id)}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-center text-sm font-medium transition hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/10"
                >
                  {b.title || b.url}
                </a>
              ))}
            </div>
          )}

          <div className="mt-10 flex items-center justify-center gap-2 text-xs text-white/30">
            <MostemLogo size={18} rounded="lg" />
            Mostem
          </div>
        </div>
      </div>
    </div>
  )
}
