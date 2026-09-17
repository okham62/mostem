export type LinkPlatform = 'coupang' | 'toss' | 'naver' | 'other'

export type ProfileBlock = {
  id: string
  title: string
  url: string
  archived?: boolean
}

export type ProfileLayout = 'profile' | 'cover' | 'cover-profile' | 'full-cover'
export type ProfileFontSize = 'sm' | 'md' | 'lg'

export type ProfileSnsLink = {
  id: string
  label: string
  url: string
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
    'blog',
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
