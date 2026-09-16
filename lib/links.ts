export type LinkPlatform = 'coupang' | 'toss' | 'naver' | 'other'

export type ProfileBlock = {
  id: string
  title: string
  url: string
  archived?: boolean
}

export type LinkSettings = {
  user_id: string
  prefix: string
  display_name: string | null
  channel_id: string
  profile_slug: string | null
  profile_blocks: ProfileBlock[]
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
