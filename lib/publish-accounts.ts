export const PUBLISH_PLATFORMS = ['threads', 'instagram', 'tiktok', 'blog'] as const

export type PublishPlatform = (typeof PUBLISH_PLATFORMS)[number]

export type PublishPlatformMeta = {
  id: PublishPlatform
  brandId: PublishPlatform
  label: string
  handlePrefix: string
  placeholder: string
  hint: string
  usernameHint: string
}

export const PUBLISH_PLATFORM_META: Record<PublishPlatform, PublishPlatformMeta> = {
  threads: {
    id: 'threads',
    brandId: 'threads',
    label: '스레드',
    handlePrefix: '@',
    placeholder: '@아이디',
    hint: '이 아이디로 스레드에 로그인한 뒤 하미로 수집하세요.',
    usernameHint: '영문/숫자/점/밑줄 2~30자',
  },
  instagram: {
    id: 'instagram',
    brandId: 'instagram',
    label: '인스타',
    handlePrefix: '@',
    placeholder: '@아이디',
    hint: '이 아이디로 인스타그램에 로그인한 뒤 하미로 수집하세요.',
    usernameHint: '영문/숫자/점/밑줄 2~30자',
  },
  tiktok: {
    id: 'tiktok',
    brandId: 'tiktok',
    label: '틱톡',
    handlePrefix: '@',
    placeholder: '@아이디',
    hint: '이 아이디로 틱톡에 로그인한 뒤 하미로 수집하세요.',
    usernameHint: '영문/숫자/점/밑줄 2~24자',
  },
  blog: {
    id: 'blog',
    brandId: 'blog',
    label: '네이버 블로그',
    handlePrefix: '',
    placeholder: '블로그 아이디',
    hint: '네이버 블로그 아이디를 연결하면 이 계정으로 글을 관리할 수 있습니다.',
    usernameHint: '네이버 아이디 또는 블로그 주소',
  },
}

export function isPublishPlatform(value: string): value is PublishPlatform {
  return PUBLISH_PLATFORMS.includes(value as PublishPlatform)
}

export function normalizePublishUsername(platform: PublishPlatform, raw: string) {
  let value = raw.trim()
  try {
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value)
      const parts = url.pathname.split('/').filter(Boolean)
      if (platform === 'blog') value = parts[0] ?? value
      else value = parts.find((part) => part && part !== 'user' && part !== '@') ?? parts.at(-1) ?? value
    }
  } catch {
    /* keep raw */
  }
  return value.replace(/^@/, '').toLowerCase()
}

export function validatePublishUsername(platform: PublishPlatform, username: string) {
  if (platform === 'tiktok') {
    return /^[a-z0-9._]{2,24}$/.test(username)
  }
  if (platform === 'blog') {
    return /^[a-z0-9_-]{2,30}$/.test(username)
  }
  return /^[a-z0-9._]{2,30}$/.test(username)
}

export function usernameError(platform: PublishPlatform) {
  return `${PUBLISH_PLATFORM_META[platform].label} 아이디는 ${PUBLISH_PLATFORM_META[platform].usernameHint}입니다.`
}

export function formatHandle(platform: PublishPlatform, username: string) {
  const prefix = PUBLISH_PLATFORM_META[platform].handlePrefix
  return `${prefix}${username}`
}
