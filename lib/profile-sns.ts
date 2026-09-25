import type { ProfileSnsLink } from '@/lib/links'

export type SnsKind =
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'x'
  | 'threads'
  | 'naver'
  | 'facebook'
  | 'website'
  | 'email'
  | 'phone'

export const SNS_PRESETS: {
  kind: SnsKind
  label: string
  placeholder: string
}[] = [
  { kind: 'instagram', label: '인스타그램', placeholder: '아이디 또는 https://' },
  { kind: 'youtube', label: '유튜브', placeholder: 'https://www.youtube.com/@...' },
  { kind: 'tiktok', label: '틱톡', placeholder: '@아이디' },
  { kind: 'x', label: 'X', placeholder: '@아이디' },
  { kind: 'threads', label: '스레드', placeholder: '@아이디' },
  { kind: 'naver', label: '네이버 블로그', placeholder: 'https://blog.naver.com/...' },
  { kind: 'facebook', label: '페이스북', placeholder: '페이지 아이디' },
  { kind: 'website', label: '홈페이지', placeholder: 'https://' },
  { kind: 'email', label: '이메일', placeholder: 'hello@example.com' },
  { kind: 'phone', label: '전화번호', placeholder: '010-0000-0000' },
]

function stripAt(value: string) {
  return value.replace(/^@+/, '').trim()
}

function ensureHttp(value: string) {
  const v = value.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  return `https://${v}`
}

export function resolveSnsUrl(kind: SnsKind, raw: string) {
  const value = raw.trim()
  if (!value) return ''
  if (kind === 'email') {
    const addr = value.replace(/^mailto:/i, '')
    return addr.includes('@') ? `mailto:${addr}` : ''
  }
  if (kind === 'phone') {
    const tel = value.replace(/^tel:/i, '').replace(/[^\d+]/g, '')
    return tel ? `tel:${tel}` : ''
  }
  if (/^https?:\/\//i.test(value) || value.startsWith('mailto:') || value.startsWith('tel:')) {
    return value
  }
  const handle = stripAt(value)
  if (kind === 'instagram') return `https://www.instagram.com/${handle}`
  if (kind === 'youtube') return handle.includes('youtube.com') ? ensureHttp(handle) : `https://www.youtube.com/@${handle}`
  if (kind === 'tiktok') return `https://www.tiktok.com/@${handle}`
  if (kind === 'x') return `https://x.com/${handle}`
  if (kind === 'threads') return `https://www.threads.net/@${handle}`
  if (kind === 'naver') return handle.includes('blog.naver.com') ? ensureHttp(handle) : `https://blog.naver.com/${handle}`
  if (kind === 'facebook') return `https://www.facebook.com/${handle}`
  return ensureHttp(value)
}

export function snsKindOf(link: ProfileSnsLink): SnsKind {
  const stored = String((link as ProfileSnsLink & { kind?: string }).kind || '')
  if (SNS_PRESETS.some((p) => p.kind === stored)) return stored as SnsKind
  const u = (link.url || '').toLowerCase()
  const label = (link.label || '').toLowerCase()
  if (u.startsWith('mailto:') || label.includes('메일')) return 'email'
  if (u.startsWith('tel:') || label.includes('전화')) return 'phone'
  if (u.includes('instagram') || label.includes('인스타')) return 'instagram'
  if (u.includes('youtube') || label.includes('유튜브')) return 'youtube'
  if (u.includes('tiktok') || label.includes('틱톡')) return 'tiktok'
  if (u.includes('threads.net') || label.includes('스레드')) return 'threads'
  if (u.includes('blog.naver') || label.includes('네이버')) return 'naver'
  if (u.includes('facebook') || label.includes('페이스')) return 'facebook'
  if (u.includes('x.com') || u.includes('twitter.com') || label === 'x') return 'x'
  return 'website'
}

export function snsHref(link: ProfileSnsLink) {
  return resolveSnsUrl(snsKindOf(link), link.url)
}
