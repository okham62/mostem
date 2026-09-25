/** Profile page visual design — stored as JSONB on link_settings.profile_design */

export type ProfileTheme = 'default' | 'light' | 'dark'
export type ProfileFontFamily = 'default' | 'serif' | 'rounded'
export type BlockShape = 'sharp' | 'rounded' | 'pill'
export type BlockStyle = 'fill' | 'outline' | 'shadow'
export type BlockShadow = 'none' | 'soft' | 'medium' | 'strong'
export type BlockAlign = 'left' | 'center'
export type BlockAnim = 'none' | 'wave' | 'bounce'
export type AffiliateNoticeStyle = 'banner' | 'card' | 'text'
export type SnsPosition = 'profile' | 'links'

export type ProfileDesign = {
  theme: ProfileTheme
  bgColor: string | null
  fontColor: string | null
  fontFamily: ProfileFontFamily
  blockShape: BlockShape
  blockStyle: BlockStyle
  blockShadow: BlockShadow
  blockAlign: BlockAlign
  blockAnim: BlockAnim
  blockColor: string | null
  blockTextColor: string | null
  hideLogo: boolean
  brandLogoUrl: string | null
  snsPosition: SnsPosition
  snsAlign: BlockAlign
  profileAlign: BlockAlign
  noticeEnabled: boolean
  noticeText: string
  noticeMarquee: boolean
  noticeUrl: string | null
  searchEnabled: boolean
  affiliateNoticeEnabled: boolean
  affiliateNoticeText: string
  affiliateNoticeStyle: AffiliateNoticeStyle
  affiliateBgColor: string | null
  affiliateTextColor: string | null
}

export const DEFAULT_AFFILIATE_NOTICE =
  '본 페이지의 일부 링크는 쿠팡 파트너스 활동을 통해 일정액의 수수료를 제공받습니다.\n본 페이지의 일부 링크는 네이버쇼핑 커넥트 활동을 통해 일정액의 수수료를 제공받습니다.'

export const DEFAULT_PROFILE_DESIGN: ProfileDesign = {
  theme: 'default',
  bgColor: null,
  fontColor: null,
  fontFamily: 'default',
  blockShape: 'rounded',
  blockStyle: 'fill',
  blockShadow: 'none',
  blockAlign: 'left',
  blockAnim: 'none',
  blockColor: null,
  blockTextColor: null,
  hideLogo: false,
  brandLogoUrl: null,
  snsPosition: 'links',
  snsAlign: 'center',
  profileAlign: 'center',
  noticeEnabled: false,
  noticeText: '',
  noticeMarquee: true,
  noticeUrl: null,
  searchEnabled: false,
  affiliateNoticeEnabled: true,
  affiliateNoticeText: DEFAULT_AFFILIATE_NOTICE,
  affiliateNoticeStyle: 'banner',
  affiliateBgColor: null,
  affiliateTextColor: null,
}

export function normalizeProfileDesign(raw: unknown): ProfileDesign {
  const base = { ...DEFAULT_PROFILE_DESIGN }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base
  const o = raw as Record<string, unknown>
  const pick = <T,>(key: keyof ProfileDesign, allowed?: readonly T[]): T => {
    const v = o[key as string]
    if (allowed) {
      return (allowed as readonly unknown[]).includes(v) ? (v as T) : (base[key] as T)
    }
    if (typeof v === typeof base[key]) return v as T
    if (v === null && (base[key] === null || typeof base[key] === 'string')) return null as T
    return base[key] as T
  }
  return {
    theme: pick('theme', ['default', 'light', 'dark'] as const),
    bgColor: typeof o.bgColor === 'string' ? o.bgColor : o.bgColor === null ? null : base.bgColor,
    fontColor: typeof o.fontColor === 'string' ? o.fontColor : o.fontColor === null ? null : base.fontColor,
    fontFamily: pick('fontFamily', ['default', 'serif', 'rounded'] as const),
    blockShape: pick('blockShape', ['sharp', 'rounded', 'pill'] as const),
    blockStyle: pick('blockStyle', ['fill', 'outline', 'shadow'] as const),
    blockShadow: pick('blockShadow', ['none', 'soft', 'medium', 'strong'] as const),
    blockAlign: pick('blockAlign', ['left', 'center'] as const),
    blockAnim: pick('blockAnim', ['none', 'wave', 'bounce'] as const),
    blockColor: typeof o.blockColor === 'string' ? o.blockColor : null,
    blockTextColor: typeof o.blockTextColor === 'string' ? o.blockTextColor : null,
    hideLogo: Boolean(o.hideLogo),
    brandLogoUrl: typeof o.brandLogoUrl === 'string' ? o.brandLogoUrl : null,
    snsPosition: pick('snsPosition', ['profile', 'links'] as const),
    snsAlign: pick('snsAlign', ['left', 'center'] as const),
    profileAlign: pick('profileAlign', ['left', 'center'] as const),
    noticeEnabled: Boolean(o.noticeEnabled),
    noticeText: typeof o.noticeText === 'string' ? o.noticeText : '',
    noticeMarquee: o.noticeMarquee === undefined ? true : Boolean(o.noticeMarquee),
    noticeUrl: typeof o.noticeUrl === 'string' ? o.noticeUrl : null,
    searchEnabled: Boolean(o.searchEnabled),
    affiliateNoticeEnabled:
      o.affiliateNoticeEnabled === undefined ? true : Boolean(o.affiliateNoticeEnabled),
    affiliateNoticeText:
      typeof o.affiliateNoticeText === 'string' ? o.affiliateNoticeText : DEFAULT_AFFILIATE_NOTICE,
    affiliateNoticeStyle: pick('affiliateNoticeStyle', ['banner', 'card', 'text'] as const),
    affiliateBgColor: typeof o.affiliateBgColor === 'string' ? o.affiliateBgColor : null,
    affiliateTextColor: typeof o.affiliateTextColor === 'string' ? o.affiliateTextColor : null,
  }
}

export function blockRadiusClass(shape: BlockShape): string {
  if (shape === 'sharp') return 'rounded-none'
  if (shape === 'pill') return 'rounded-full'
  return 'rounded-xl'
}

export function blockShadowClass(shadow: BlockShadow): string {
  if (shadow === 'soft') return 'shadow-md shadow-black/30'
  if (shadow === 'medium') return 'shadow-lg shadow-black/40'
  if (shadow === 'strong') return 'shadow-xl shadow-black/50'
  return ''
}
