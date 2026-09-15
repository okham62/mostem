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
    label: 'Threads',
    handlePrefix: '@',
    placeholder: '@username',
    hint: 'Log in to Threads with this ID, then collect with Hami.',
    usernameHint: 'Letters, numbers, dots, underscores (2–30)',
  },
  instagram: {
    id: 'instagram',
    brandId: 'instagram',
    label: 'Instagram',
    handlePrefix: '@',
    placeholder: '@username',
    hint: 'Log in to Instagram with this ID, then collect with Hami.',
    usernameHint: 'Letters, numbers, dots, underscores (2–30)',
  },
  tiktok: {
    id: 'tiktok',
    brandId: 'tiktok',
    label: 'TikTok',
    handlePrefix: '@',
    placeholder: '@username',
    hint: 'Log in to TikTok with this ID, then collect with Hami.',
    usernameHint: 'Letters, numbers, dots, underscores (2–24)',
  },
  blog: {
    id: 'blog',
    brandId: 'blog',
    label: 'Blog Hub',
    handlePrefix: '',
    placeholder: 'blog id',
    hint: 'Connect a blog account to manage posts here.',
    usernameHint: 'Blog ID or URL',
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
