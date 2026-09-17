import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  detectLinkPlatform,
  isValidPrefix,
  makeLinkCode,
  normalizeDestinationUrl,
  type LinkSettings,
  type ProfileBlock,
  type TrackedLink,
} from '@/lib/links'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function ensureSettings(userId: string): Promise<LinkSettings> {
  const supabase = createAdminClient()
  const { data } = await supabase.from('link_settings').select('*').eq('user_id', userId).maybeSingle()
  if (data) {
    return {
      ...(data as LinkSettings),
      profile_blocks: Array.isArray(data.profile_blocks) ? (data.profile_blocks as ProfileBlock[]) : [],
      hotdeal_categories: Array.isArray(data.hotdeal_categories) ? data.hotdeal_categories : [],
    }
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
  return {
    ...(inserted as LinkSettings),
    profile_blocks: [],
    hotdeal_categories: [],
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = createAdminClient()
    const settings = await ensureSettings(session.user.id)
    const { data: links, error } = await supabase
      .from('tracked_links')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      settings,
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
    const ogImageUrl =
      typeof body.ogImageUrl === 'string' && body.ogImageUrl.trim() ? body.ogImageUrl.trim() : null
    if (ogImageUrl && ogImageUrl.length > 1_500_000) {
      return NextResponse.json({ error: '이미지가 너무 큽니다 (약 1MB 이하)' }, { status: 400 })
    }

    const settings = await ensureSettings(session.user.id)
    const supabase = createAdminClient()
    const platform = detectLinkPlatform(destination)
    const channel = (body.channel ?? settings.channel_id ?? '기본값').trim() || '기본값'

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
        destination_url: destination,
        title,
        og_image_url: ogImageUrl,
        platform,
        channel,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ link: link as TrackedLink, settings })
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
        const { isValidSlug } = await import('@/lib/links')
        if (!isValidSlug(slug)) {
          return NextResponse.json({ error: '프로필 주소는 영문 소문자·숫자·하이픈 3~30자' }, { status: 400 })
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
      patch.profile_blocks = Array.isArray(body.profileBlocks) ? body.profileBlocks : []
    }

    if (body.hotdealSlug !== undefined) {
      const slug = body.hotdealSlug?.trim().toLowerCase() || null
      if (slug) {
        const { isValidSlug } = await import('@/lib/links')
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Keep existing short links consistent when prefix changes
    if (typeof patch.prefix === 'string') {
      await supabase
        .from('tracked_links')
        .update({ prefix: patch.prefix })
        .eq('user_id', session.user.id)
    }

    return NextResponse.json({
      settings: {
        ...(data as LinkSettings),
        profile_blocks: Array.isArray(data.profile_blocks) ? data.profile_blocks : [],
        hotdeal_categories: Array.isArray(data.hotdeal_categories) ? data.hotdeal_categories : [],
      },
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
