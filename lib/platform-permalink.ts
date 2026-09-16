import type { CollectPlatform } from '@/types'

export function platformPermalink(input: {
  platform: CollectPlatform | string
  url?: string | null
  author?: string | null
  postId?: string | null
}) {
  const existing = String(input.url || '').trim()
  if (existing.startsWith('http')) return existing

  const author = String(input.author || '')
    .replace(/^@/, '')
    .trim()
  const id = String(input.postId || '').trim()

  if (input.platform === 'instagram') {
    if (id) return `https://www.instagram.com/p/${id}/`
    if (author) return `https://www.instagram.com/${author}/`
    return 'https://www.instagram.com/'
  }

  if (input.platform === 'tiktok') {
    if (author && id) return `https://www.tiktok.com/@${author}/video/${id}`
    if (id) return `https://www.tiktok.com/video/${id}`
    if (author) return `https://www.tiktok.com/@${author}`
    return 'https://www.tiktok.com/'
  }

  if (author && id) return `https://www.threads.com/@${author}/post/${id}`
  return existing || 'https://www.threads.com/'
}

export function platformHome(platform: CollectPlatform | string) {
  if (platform === 'instagram') return 'https://www.instagram.com/'
  if (platform === 'tiktok') return 'https://www.tiktok.com/'
  return 'https://www.threads.com/'
}

export function platformLabel(platform: CollectPlatform | string) {
  if (platform === 'instagram') return 'Instagram'
  if (platform === 'tiktok') return 'TikTok'
  if (platform === 'threads') return 'Threads'
  return platform
}
