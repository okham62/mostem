import type { CollectMediaItem, CollectedPost } from '@/types'

function isVideoFile(url: string) {
  return /\.(mp4|m3u8|webm|mov)(\?|$)/i.test(url)
}

export function parseMediaItems(post: CollectedPost): CollectMediaItem[] {
  const raw = post.media_url
  if (raw?.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as CollectMediaItem[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((item) => item?.url)
      }
    } catch {
      /* keep fallback */
    }
  }

  const items: CollectMediaItem[] = []
  if (post.thumbnail_url) {
    items.push({ url: post.thumbnail_url, type: 'image' })
  }
  if (raw && raw !== post.thumbnail_url && !raw.trim().startsWith('[')) {
    items.push({
      url: raw,
      type: isVideoFile(raw) ? 'video' : 'image',
      videoUrl: isVideoFile(raw) ? raw : undefined,
    })
  }
  return items
}

export function serializeMediaItems(items?: CollectMediaItem[] | null) {
  if (!items?.length) return null
  return JSON.stringify(items)
}

export function splitCaption(caption: string) {
  return caption.split(/([#@][\w가-힣_]+|\s+)/).filter((part) => part.length > 0)
}

export function isHashtag(part: string) {
  return /^#[\w가-힣_]+$/.test(part)
}
