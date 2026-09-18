import { createAdminClient } from '@/lib/supabase/admin'
import { MostemLogo } from '@/components/mostem-logo'
import {
  normalizeLinkSettings,
  type ProfileBlock,
  type ProfileSnsLink,
} from '@/lib/links'
import {
  blockRadiusClass,
  blockShadowClass,
  DEFAULT_AFFILIATE_NOTICE,
  normalizeProfileDesign,
} from '@/lib/profile-design'
import { notFound } from 'next/navigation'
import { ProfilePublicClient } from './profile-public-client'
import { Link2 } from 'lucide-react'

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
  const d = normalizeProfileDesign(settings.profile_design)
  const font = fontSize === 'sm' ? 'text-lg' : fontSize === 'lg' ? 'text-3xl' : 'text-2xl'
  const showCover = layout !== 'profile'
  const showAvatarOnCover = layout !== 'full-cover'
  const coverH = layout === 'full-cover' ? 'h-52' : layout === 'cover-profile' ? 'h-40' : 'h-36'
  const themeBg =
    d.bgColor ||
    (d.theme === 'light' ? '#f4f4f5' : d.theme === 'dark' ? '#0a0a0b' : '#121214')
  const themeFg = d.fontColor || (d.theme === 'light' ? '#111113' : '#ffffff')
  const fontFamily =
    d.fontFamily === 'serif'
      ? 'Georgia, "Times New Roman", serif'
      : d.fontFamily === 'rounded'
        ? '"Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
        : 'inherit'
  const blockRadius = blockRadiusClass(d.blockShape)
  const blockShadow = blockShadowClass(d.blockShadow)
  const blockAlign = d.blockAlign === 'center' ? 'text-center' : 'text-left'
  const blockBg = d.blockColor || (d.theme === 'light' ? '#ffffff' : 'rgba(255,255,255,0.08)')
  const blockFg = d.blockTextColor || themeFg
  const blockBorder =
    d.blockStyle === 'outline'
      ? `1px solid ${d.blockColor || (d.theme === 'light' ? '#d4d4d8' : 'rgba(255,255,255,0.25)')}`
      : undefined
  const affiliateBg = d.affiliateBgColor || '#5b3cc4'
  const affiliateFg = d.affiliateTextColor || '#ffffff'
  const noticeText = d.affiliateNoticeText || DEFAULT_AFFILIATE_NOTICE
  const pageBg = d.theme === 'light' ? '#e4e4e7' : '#0b0b0d'

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: pageBg, color: themeFg }}>
      <ProfilePublicClient slug={slug} />
      <div
        className="mx-auto w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 shadow-2xl"
        style={{ background: themeBg, fontFamily }}
      >
        {d.noticeEnabled && d.noticeText ? (
          <div className="border-b border-black/10 px-4 py-2 text-xs opacity-80">
            {d.noticeUrl ? (
              <a href={d.noticeUrl} className="underline">
                {d.noticeText}
              </a>
            ) : (
              d.noticeText
            )}
          </div>
        ) : null}

        {d.affiliateNoticeEnabled ? (
          d.affiliateNoticeStyle === 'banner' ? (
            <div
              className="px-4 py-2.5 text-[11px] leading-relaxed whitespace-pre-line"
              style={{ background: affiliateBg, color: affiliateFg }}
            >
              {noticeText}
            </div>
          ) : d.affiliateNoticeStyle === 'card' ? (
            <div className="px-4 pt-4">
              <div
                className="rounded-xl px-3 py-2.5 text-[11px] leading-relaxed whitespace-pre-line"
                style={{ background: affiliateBg, color: affiliateFg }}
              >
                {noticeText}
              </div>
            </div>
          ) : (
            <p className="px-4 pt-4 text-[11px] leading-relaxed whitespace-pre-line opacity-70">
              {noticeText}
            </p>
          )
        ) : null}

        {showCover ? (
          <div
            className={`relative ${coverH}`}
            style={
              coverUrl
                ? {
                    backgroundImage: `url(${coverUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : {
                    background:
                      'linear-gradient(135deg, rgba(180,83,9,0.35), rgba(120,53,15,0.25))',
                  }
            }
          >
            {showAvatarOnCover ? (
              <div className="absolute inset-x-0 -bottom-10 flex justify-center">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-20 w-20 rounded-full object-cover ring-4"
                    style={{ boxShadow: `0 0 0 4px ${themeBg}` }}
                  />
                ) : (
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full"
                    style={{ background: 'rgba(251,191,36,0.2)', boxShadow: `0 0 0 4px ${themeBg}` }}
                  >
                    <MostemLogo size={44} rounded="full" />
                  </div>
                )}
              </div>
            ) : null}
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

        <div
          className={`px-5 pb-8 text-center ${
            showCover && showAvatarOnCover ? 'pt-14' : showCover ? 'pt-5' : 'pt-4'
          }`}
        >
          <h1 className={`font-bold ${font}`}>{name}</h1>
          {bio ? <p className="mt-2 text-sm opacity-50">{bio}</p> : null}

          {sns.length > 0 ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {sns.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full px-3 py-1 text-xs opacity-70"
                  style={{ background: 'rgba(128,128,128,0.2)' }}
                >
                  {s.label || 'SNS'}
                </a>
              ))}
            </div>
          ) : null}

          {blocks.length === 0 ? (
            <div
              className={`mt-8 border border-dashed px-4 py-10 text-sm opacity-50 ${blockRadius}`}
              style={{
                borderColor: d.theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
              }}
            >
              <Link2 className="mx-auto mb-2 h-5 w-5 text-[var(--accent)]" />
              아직 공개된 링크가 없어요
              <p className="mt-1 text-xs opacity-60">곧 새로운 추천을 채워둘게요.</p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-3">
              {blocks.map((b: ProfileBlock) => (
                <a
                  key={b.id}
                  href={`/u/${slug}/go/${encodeURIComponent(b.id)}`}
                  className={`${blockRadius} ${blockShadow} ${blockAlign} px-4 py-3.5 text-sm font-medium transition hover:opacity-90`}
                  style={{
                    background: d.blockStyle === 'outline' ? 'transparent' : blockBg,
                    color: blockFg,
                    border: blockBorder,
                  }}
                >
                  {b.title || b.url}
                </a>
              ))}
            </div>
          )}

          {!d.hideLogo ? (
            <div className="mt-10 flex items-center justify-center gap-2 text-xs opacity-35">
              {d.brandLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.brandLogoUrl} alt="" className="h-[18px] w-[18px] rounded object-cover" />
              ) : (
                <MostemLogo size={18} rounded="lg" />
              )}
              Mostem
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
