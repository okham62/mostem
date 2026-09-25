import {
  normalizeProfileDesign,
  type ProfileDesign,
} from '@/lib/profile-design'

export type { ProfileDesign }

export type LinkPlatform = 'coupang' | 'toss' | 'naver' | 'other'

export type ProfileBlock = {
  id: string
  title: string
  url: string
  image?: string | null
  archived?: boolean
  pinned?: boolean
  enabled?: boolean
}

export function findTrackedLinkForBlock<
  T extends { prefix: string; code: string; destination_url?: string | null },
>(block: Pick<ProfileBlock, 'url'>, links: T[] = []): T | undefined {
  const url = String(block.url || '')
  if (!url) return undefined
  return links.find((link) => {
    const path = shortPath(link.prefix, link.code)
    const loose = `/${link.prefix}/${link.code}`
    return (
      url.includes(path) ||
      url.includes(loose) ||
      Boolean(link.destination_url && url.includes(link.destination_url))
    )
  })
}

export function persistableBlockImage(image?: string | null): string | null {
  const stored = String(image || '').trim()
  if (!stored) return null
  if (/^https?:\/\//i.test(stored)) return stored.slice(0, 2000)
  return null
}

/** Drop data-URL images so profile_blocks stays small enough to save. */
export function slimProfileBlocks(blocks: ProfileBlock[]): ProfileBlock[] {
  return (Array.isArray(blocks) ? blocks : [])
    .filter((b) => b && typeof b === 'object')
    .map((b) => ({
      id: String(b.id || '').trim() || crypto.randomUUID(),
      title: String(b.title || '').slice(0, 240),
      url: String(b.url || '').trim().slice(0, 2000),
      image: persistableBlockImage(b.image),
      archived: Boolean(b.archived),
      pinned: Boolean(b.pinned),
      enabled: b.enabled !== false,
    }))
}

export function profileBlockImage(block: ProfileBlock, links: TrackedLink[] = []): string {
  const stored = String(block.image || '').trim()
  if (stored) return stored
  return String(findTrackedLinkForBlock(block, links)?.og_image_url || '').trim()
}

export function profileBlockFromTrackedLink(link: TrackedLink, origin?: string): ProfileBlock {
  return {
    id: crypto.randomUUID(),
    title: String(link.title || '상품').slice(0, 240),
    url: origin
      ? absoluteShortUrl(origin, link.prefix, link.code)
      : shortPath(link.prefix, link.code),
    image: persistableBlockImage(link.og_image_url),
    enabled: true,
    pinned: false,
  }
}

export function missingProfileBlocksFromLinks(
  blocks: ProfileBlock[],
  links: TrackedLink[],
  origin?: string,
): ProfileBlock[] {
  return [...links]
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
    .filter((link) => !blocks.some((b) => Boolean(findTrackedLinkForBlock(b, [link]))))
    .map((link) => profileBlockFromTrackedLink(link, origin))
}

export function isProfileBlockOn(block: ProfileBlock) {
  return !block.archived && block.enabled !== false
}

export function sortProfileBlocks(blocks: ProfileBlock[]) {
  return [...blocks].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
}

export type ProfileLayout = 'profile' | 'cover' | 'cover-profile' | 'full-cover'
export type ProfileFontSize = 'sm' | 'md' | 'lg'

export type ProfileSnsLink = {
  id: string
  label: string
  url: string
  kind?: string
}

export type LinkSettings = {
  user_id: string
  prefix: string
  display_name: string | null
  channel_id: string
  profile_slug: string | null
  profile_blocks: ProfileBlock[]
  profile_published: boolean
  profile_simple_address: boolean
  profile_avatar_url: string | null
  profile_cover_url: string | null
  profile_layout: ProfileLayout | string
  profile_bio: string | null
  profile_sns: ProfileSnsLink[]
  profile_font_size: ProfileFontSize | string
  profile_design: ProfileDesign
  hotdeal_slug: string | null
  hotdeal_name: string | null
  hotdeal_intro: string | null
  hotdeal_categories: string[]
  hotdeal_published: boolean
  hotdeal_theme: string
  hotdeal_bg: string
  created_at: string
  updated_at: string
}

export type TrackedLink = {
  id: string
  user_id: string
  prefix: string
  code: string
  destination_url: string
  title: string
  og_image_url: string | null
  platform: LinkPlatform | string
  channel: string
  click_count: number
  created_at: string
}

/** Normalize a link_settings row (handles missing migration columns). */
export function normalizeLinkSettings(data: Record<string, unknown>): LinkSettings {
  const snsRaw = data.profile_sns
  const sns = Array.isArray(snsRaw)
    ? (snsRaw as ProfileSnsLink[]).filter((s) => s && typeof s.url === 'string')
    : []
  return {
    ...(data as unknown as LinkSettings),
    profile_blocks: Array.isArray(data.profile_blocks)
      ? (data.profile_blocks as ProfileBlock[])
      : [],
    hotdeal_categories: Array.isArray(data.hotdeal_categories)
      ? (data.hotdeal_categories as string[])
      : [],
    profile_published: Boolean(data.profile_published),
    profile_simple_address: Boolean(data.profile_simple_address),
    profile_avatar_url:
      typeof data.profile_avatar_url === 'string' ? data.profile_avatar_url : null,
    profile_cover_url:
      typeof data.profile_cover_url === 'string' ? data.profile_cover_url : null,
    profile_layout:
      typeof data.profile_layout === 'string' && data.profile_layout
        ? data.profile_layout
        : 'cover',
    profile_bio: typeof data.profile_bio === 'string' ? data.profile_bio : null,
    profile_sns: sns,
    profile_font_size:
      typeof data.profile_font_size === 'string' && data.profile_font_size
        ? data.profile_font_size
        : 'md',
    profile_design: normalizeProfileDesign(data.profile_design),
  }
}

/** Public path — `/{slug}` when simple address is on, else `/u/{slug}`. */
export function profilePublicPath(input: {
  profile_slug: string | null
  profile_simple_address?: boolean
}): string | null {
  const slug = (input.profile_slug || '').trim().toLowerCase()
  if (!slug) return null
  return input.profile_simple_address ? `/${slug}` : `/u/${slug}`
}

/** Paths that must never be treated as vanity profile slugs. */
export const RESERVED_PROFILE_SLUGS = new Set(
  [
    'api',
    'login',
    'logout',
    'signin',
    'signout',
    'auth',
    'dashboard',
    'links',
    'threads',
    'instagram',
    'tiktok',
    'blog',
    'ai',
    'keywords',
    'news',
    'markets',
    'trends',
    'shopping',
    'settings',
    'admin',
    'u',
    's',
    'l',
    'hotdeal',
    'pricing',
    'docs',
    'help',
    'about',
    'terms',
    'privacy',
    'mostem',
    'hami',
  ].map((s) => s.toLowerCase()),
)

const CODE_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function makeLinkCode(length = 8) {
  let out = ''
  const c = globalThis.crypto
  const bytes = new Uint8Array(length)
  if (c?.getRandomValues) c.getRandomValues(bytes)
  else for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256)
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length]
  return out
}

export function detectLinkPlatform(url: string): LinkPlatform {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('coupang')) return 'coupang'
    if (host.includes('toss')) return 'toss'
    if (host.includes('naver') || host.includes('smartstore')) return 'naver'
  } catch {
    /* ignore */
  }
  return 'other'
}

export function normalizeDestinationUrl(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('URL을 입력해 주세요')
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const url = new URL(withProtocol)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('http(s) URL만 가능합니다')
  return url.toString()
}

export function shortPath(prefix: string, code: string) {
  return `/l/${prefix}/${code}`
}

export function absoluteShortUrl(origin: string, prefix: string, code: string) {
  return `${origin.replace(/\/$/, '')}${shortPath(prefix, code)}`
}

export function isValidPrefix(value: string) {
  return /^[a-z0-9]{1,12}$/.test(value)
}

export function isValidSlug(value: string) {
  return /^[a-z0-9-]{3,30}$/.test(value)
}

export const HOTDEAL_CATEGORIES = [
  '가구/홈데코',
  '가전/디지털',
  '도서',
  '문구/오피스',
  '반려/애완용품',
  '뷰티',
  '생활용품',
  '스포츠/레저',
  '식품',
  '여행/취미',
  '완구/취미',
  '음반/DVD',
  '자동차용품',
  '주방용품',
  '출산/유아동',
  '패션의류/잡화',
] as const

export const PLATFORM_LABEL: Record<string, string> = {
  coupang: '쿠팡',
  toss: '토스',
  naver: '네이버',
  other: '기타',
}
