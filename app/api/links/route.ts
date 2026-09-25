import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveOgImageForStorage } from '@/lib/link-preview'
import {
  detectLinkPlatform,
  isValidPrefix,
  isValidSlug,
  makeLinkCode,
  normalizeDestinationUrl,
  normalizeLinkSettings,
  RESERVED_PROFILE_SLUGS,
  slimProfileBlocks,
  profileBlockFromTrackedLink,
  type LinkSettings,
  type ProfileBlock,
  type ProfileSnsLink,
  type TrackedLink,
} from '@/lib/links'
import { createCoupangDeeplink } from '@/lib/partners-coupang'
import {
  getPartnerDef,
  isPartnerConnected,
  parsePartnerApis,
} from '@/lib/partners'
import { normalizeProfileDesign } from '@/lib/profile-design'
import { syncProfileBlocksFromLinks } from '@/lib/profile-sync'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function ensureSettings(userId: string): Promise<LinkSettings> {
  const supabase = createAdminClient()
  const { data } = await supabase.from('link_settings').select('*').eq('user_id', userId).maybeSingle()
  if (data) {
    return normalizeLinkSettings(data as Record<string, unknown>)
  }

  let prefix = 'm'
  for (let i = 0; i < 8; i++) {
    const candidate = i === 0 ? 'm' : makeLinkCode(4)
    const { data: clash } = await supabase
      .from('link_settings')
      .select('user_id')
      .eq('prefix', candidate)
      .maybeSingle()
    if (!clash) {
      prefix = candidate
      break
    }
  }

  const row = {
    user_id: userId,
    prefix,
    display_name: null,
    channel_id: '기본값',
    profile_slug: null,
    profile_blocks: [],
    profile_published: false,
    profile_simple_address: false,
    profile_avatar_url: null,
    profile_cover_url: null,
    profile_layout: 'cover',
    profile_bio: null,
    profile_sns: [],
    profile_font_size: 'md',
    hotdeal_slug: null,
    hotdeal_name: null,
    hotdeal_intro: null,
    hotdeal_categories: [],
    hotdeal_published: false,
    hotdeal_theme: 'mostem',
    hotdeal_bg: 'dark',
  }

  const { data: inserted, error } = await supabase.from('link_settings').insert(row).select('*').single()
  if (error) throw new Error(error.message)
  return normalizeLinkSettings(inserted as Record<string, unknown>)
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = createAdminClient()
    await ensureSettings(session.user.id)
    const { data: links, error } = await supabase
      .from('tracked_links')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const origin = 'https://www.mostem.kr'
    const synced = await syncProfileBlocksFromLinks(
      session.user.id,
      (links ?? []) as TrackedLink[],
      origin,
    )

    return NextResponse.json({
      settings: synced.settings,
      links: (links ?? []) as TrackedLink[],
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await req.json()) as {
      url?: string
      title?: string
      ogImageUrl?: string | null
      channel?: string
    }

    const destination = normalizeDestinationUrl(body.url ?? '')
    const title = (body.title ?? '').trim() || '추천 상품'
    // Remote Coupang CDN URLs are inlined to data URLs so list/share cards always show.
    // Soft-fail: link still creates if the image cannot be fetched.
    const ogImageUrl = await resolveOgImageForStorage(
      typeof body.ogImageUrl === 'string' ? body.ogImageUrl : null
    )

    const settings = await ensureSettings(session.user.id)
    const supabase = createAdminClient()
    const platform = detectLinkPlatform(destination)
    const channel = (body.channel ?? settings.channel_id ?? '기본값').trim() || '기본값'

    let finalDestination = destination
    if (platform === 'coupang') {
      try {
        const { data: settingsRaw } = await supabase
          .from('link_settings')
          .select('partner_apis')
          .eq('user_id', session.user.id)
          .maybeSingle()
        const apis = parsePartnerApis(settingsRaw?.partner_apis)
        const def = getPartnerDef('coupang')
        const cred = apis.coupang
        if (def && isPartnerConnected(def, cred) && cred?.accessKey && cred?.secretKey) {
          const converted = await createCoupangDeeplink(
            String(cred.accessKey),
            String(cred.secretKey),
            destination,
            channel
          )
          if (converted.ok) {
            finalDestination = converted.shortenUrl
          }
        }
      } catch {
        // Soft-fail: keep original destination if deeplink conversion fails.
      }
    }

    let code = makeLinkCode(8)
    for (let i = 0; i < 6; i++) {
      const { data: exists } = await supabase
        .from('tracked_links')
        .select('id')
        .eq('prefix', settings.prefix)
        .eq('code', code)
        .maybeSingle()
      if (!exists) break
      code = makeLinkCode(8)
    }

    const { data: link, error } = await supabase
      .from('tracked_links')
      .insert({
        user_id: session.user.id,
        prefix: settings.prefix,
        code,
        destination_url: finalDestination,
        title,
        og_image_url: ogImageUrl,
        platform,
        channel,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const nextBlocks = slimProfileBlocks([
      ...settings.profile_blocks,
      profileBlockFromTrackedLink(link as TrackedLink, 'https://www.mostem.kr'),
    ])
    const { data: updated } = await supabase
      .from('link_settings')
      .update({
        profile_blocks: nextBlocks,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', session.user.id)
      .select('*')
      .maybeSingle()

    return NextResponse.json({
      link: link as TrackedLink,
      settings: updated
        ? normalizeLinkSettings(updated as Record<string, unknown>)
        : { ...settings, profile_blocks: nextBlocks },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await req.json()) as Partial<{
      prefix: string
      displayName: string | null
      channelId: string
      profileSlug: string | null
      profileBlocks: ProfileBlock[]
      profilePublished: boolean
      profileSimpleAddress: boolean
      profileAvatarUrl: string | null
      profileCoverUrl: string | null
      profileLayout: string
      profileBio: string | null
      profileSns: ProfileSnsLink[]
      profileFontSize: string
      profileDesign: Record<string, unknown>
      hotdealSlug: string | null
      hotdealName: string | null
      hotdealIntro: string | null
      hotdealCategories: string[]
      hotdealPublished: boolean
      hotdealTheme: string
      hotdealBg: string
    }>

    await ensureSettings(session.user.id)
    const supabase = createAdminClient()
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.prefix !== undefined) {
      const prefix = body.prefix.trim().toLowerCase()
      if (!isValidPrefix(prefix)) {
        return NextResponse.json({ error: '접두사는 영문 소문자·숫자 1~12자' }, { status: 400 })
      }
      const { data: clash } = await supabase
        .from('link_settings')
        .select('user_id')
        .eq('prefix', prefix)
        .neq('user_id', session.user.id)
        .maybeSingle()
      if (clash) return NextResponse.json({ error: '이미 사용 중인 접두사입니다' }, { status: 409 })
      patch.prefix = prefix
    }

    if (body.displayName !== undefined) patch.display_name = body.displayName?.trim() || null
    if (body.channelId !== undefined) patch.channel_id = body.channelId.trim() || '기본값'

    if (body.profileSlug !== undefined) {
      const slug = body.profileSlug?.trim().toLowerCase() || null
      if (slug) {
        if (!isValidSlug(slug) || RESERVED_PROFILE_SLUGS.has(slug)) {
          return NextResponse.json(
            { error: '프로필 주소는 영문 소문자·숫자·하이픈 3~30자 (예약어 불가)' },
            { status: 400 },
          )
        }
        const { data: clash } = await supabase
          .from('link_settings')
          .select('user_id')
          .eq('profile_slug', slug)
          .neq('user_id', session.user.id)
          .maybeSingle()
        if (clash) return NextResponse.json({ error: '이미 사용 중인 프로필 주소입니다' }, { status: 409 })
      }
      patch.profile_slug = slug
    }

    if (body.profileBlocks !== undefined) {
      const slimmed = slimProfileBlocks(Array.isArray(body.profileBlocks) ? body.profileBlocks : [])
      if (JSON.stringify(slimmed).length > 400_000) {
        return NextResponse.json(
          { error: '상품 목록이 너무 커요. 이미지를 빼고 다시 저장해 주세요.' },
          { status: 400 },
        )
      }
      patch.profile_blocks = slimmed
    }
    if (body.profilePublished !== undefined) patch.profile_published = !!body.profilePublished
    if (body.profileSimpleAddress !== undefined) {
      patch.profile_simple_address = !!body.profileSimpleAddress
    }
    if (body.profileAvatarUrl !== undefined) {
      const v = body.profileAvatarUrl?.trim() || null
      if (v && v.length > 1_500_000) {
        return NextResponse.json({ error: '프로필 이미지가 너무 큽니다' }, { status: 400 })
      }
      patch.profile_avatar_url = v
    }
    if (body.profileCoverUrl !== undefined) {
      const v = body.profileCoverUrl?.trim() || null
      if (v && v.length > 1_500_000) {
        return NextResponse.json({ error: '커버 이미지가 너무 큽니다' }, { status: 400 })
      }
      patch.profile_cover_url = v
    }
    if (body.profileLayout !== undefined) {
      const allowed = new Set(['profile', 'cover', 'cover-profile', 'full-cover'])
      patch.profile_layout = allowed.has(body.profileLayout) ? body.profileLayout : 'cover'
    }
    if (body.profileBio !== undefined) patch.profile_bio = body.profileBio?.trim() || null
    if (body.profileSns !== undefined) {
      patch.profile_sns = Array.isArray(body.profileSns)
        ? body.profileSns
            .filter((s) => s && typeof s.url === 'string' && s.url.trim())
            .map((s) => ({
              id: String(s.id || crypto.randomUUID()),
              label: String(s.label || 'SNS').slice(0, 40),
              url: String(s.url).trim(),
            }))
        : []
    }
    if (body.profileFontSize !== undefined) {
      const allowed = new Set(['sm', 'md', 'lg'])
      patch.profile_font_size = allowed.has(body.profileFontSize) ? body.profileFontSize : 'md'
    }
    if (body.profileDesign !== undefined) {
      patch.profile_design = normalizeProfileDesign(body.profileDesign)
    }

    if (body.hotdealSlug !== undefined) {
      const slug = body.hotdealSlug?.trim().toLowerCase() || null
      if (slug) {
        if (!isValidSlug(slug)) {
          return NextResponse.json({ error: '핫딜 주소는 영문 소문자·숫자·하이픈 3~30자' }, { status: 400 })
        }
        const { data: clash } = await supabase
          .from('link_settings')
          .select('user_id')
          .eq('hotdeal_slug', slug)
          .neq('user_id', session.user.id)
          .maybeSingle()
        if (clash) return NextResponse.json({ error: '이미 사용 중인 핫딜 주소입니다' }, { status: 409 })
      }
      patch.hotdeal_slug = slug
    }

    if (body.hotdealName !== undefined) patch.hotdeal_name = body.hotdealName?.trim() || null
    if (body.hotdealIntro !== undefined) patch.hotdeal_intro = body.hotdealIntro?.trim() || null
    if (body.hotdealCategories !== undefined) {
      patch.hotdeal_categories = Array.isArray(body.hotdealCategories) ? body.hotdealCategories : []
    }
    if (body.hotdealPublished !== undefined) patch.hotdeal_published = !!body.hotdealPublished
    if (body.hotdealTheme !== undefined) patch.hotdeal_theme = body.hotdealTheme || 'mostem'
    if (body.hotdealBg !== undefined) patch.hotdeal_bg = body.hotdealBg || 'dark'

    const { data, error } = await supabase
      .from('link_settings')
      .update(patch)
      .eq('user_id', session.user.id)
      .select('*')
      .single()

    if (error) {
      if (/column .* does not exist/i.test(error.message)) {
        return NextResponse.json(
          {
            error:
              '프로필 컬럼이 없습니다. Supabase에 supabase/profile_page.sql 과 supabase/profile_design.sql 을 실행해 주세요.',
          },
          { status: 500 },
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (typeof patch.prefix === 'string') {
      await supabase
        .from('tracked_links')
        .update({ prefix: patch.prefix })
        .eq('user_id', session.user.id)
    }

    return NextResponse.json({
      settings: normalizeLinkSettings(data as Record<string, unknown>),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

/** Bulk delete: { ids: string[] } or { all: true } */
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await req.json().catch(() => ({}))) as { ids?: string[]; all?: boolean }
    const supabase = createAdminClient()

    if (body.all) {
      const { error, count } = await supabase
        .from('tracked_links')
        .delete({ count: 'exact' })
        .eq('user_id', session.user.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, deleted: count ?? 0 })
    }

    const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === 'string' && id) : []
    if (!ids.length) return NextResponse.json({ error: '삭제할 링크를 선택하세요' }, { status: 400 })

    const { error, count } = await supabase
      .from('tracked_links')
      .delete({ count: 'exact' })
      .eq('user_id', session.user.id)
      .in('id', ids.slice(0, 500))

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, deleted: count ?? ids.length })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
