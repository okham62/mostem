import type { CollectMediaItem, CollectedPost } from '@/types'

export function cleanMediaUrl(url?: string | null) {
  if (!url) return null
  const value = url.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').trim()
  if (!value.startsWith('http://') && !value.startsWith('https://')) return null
  return value
}

function isVideoFile(url: string) {
  return /\.(mp4|m3u8|webm|mov)(\?|$)/i.test(url)
}

function isVideoItem(item: CollectMediaItem) {
  return item.type === 'video' || !!item.videoUrl || isVideoFile(item.url)
}

export function sortMediaVideoLeft(items: CollectMediaItem[]) {
  return [...items].sort((a, b) => Number(isVideoItem(b)) - Number(isVideoItem(a)))
}

export function parseMediaItems(post: CollectedPost): CollectMediaItem[] {
  const raw = post.media_url
  if (raw?.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as CollectMediaItem[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sortMediaVideoLeft(
          parsed
            .map((item) => ({
              ...item,
              url: cleanMediaUrl(item.url) ?? '',
              poster: cleanMediaUrl(item.poster) ?? undefined,
              videoUrl: cleanMediaUrl(item.videoUrl) ?? undefined,
            }))
            .filter((item) => item.url)
        )
      }
    } catch {
      /* keep fallback */
    }
  }

  const items: CollectMediaItem[] = []
  const thumb = cleanMediaUrl(post.thumbnail_url)
  if (thumb) {
    items.push({ url: thumb, type: 'image' })
  }
  const single = cleanMediaUrl(raw && !raw.trim().startsWith('[') ? raw : null)
  if (single && single !== thumb) {
    items.push({
      url: single,
      type: isVideoFile(single) ? 'video' : 'image',
      videoUrl: isVideoFile(single) ? single : undefined,
    })
  }
  return sortMediaVideoLeft(items)
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
