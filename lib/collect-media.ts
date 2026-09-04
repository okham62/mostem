import type { CollectMediaItem, CollectedPost } from '@/types'

export function cleanMediaUrl(url?: string | null) {
  if (!url) return null
  const value = url.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').trim()
  if (!value.startsWith('http://') && !value.startsWith('https://')) return null
  return value
}

export function isVideoFile(url: string) {
  return /\.(mp4|m3u8|webm|mov)(\?|$)/i.test(url)
}

export function imagePosterUrl(...urls: Array<string | null | undefined>) {
  for (const url of urls) {
    const clean = cleanMediaUrl(url)
    if (clean && !isVideoFile(clean)) return clean
  }
  return null
}

export function isVideoItem(item: CollectMediaItem) {
  return item.type === 'video' || !!item.videoUrl || isVideoFile(item.url)
}

export function sortMediaVideoLeft(items: CollectMediaItem[]) {
  return [...items].sort((a, b) => Number(isVideoItem(b)) - Number(isVideoItem(a)))
}

export function previewMedia(items: CollectMediaItem[]) {
  const videos = items.filter(isVideoItem)
  const photos = items.filter((item) => !isVideoItem(item))
  const shown: CollectMediaItem[] = []
  if (videos[0]) shown.push(videos[0])
  if (photos[0]) shown.push(photos[0])
  else if (videos[1] && shown.length === 1) shown.push(videos[1])
  const hidden = Math.max(0, items.length - shown.length)
  return { shown, hidden }
}

export function parseMediaItems(post: CollectedPost): CollectMediaItem[] {
  const raw = post.media_url
  const thumb = cleanMediaUrl(post.thumbnail_url)
  if (raw?.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as CollectMediaItem[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sortMediaVideoLeft(
          parsed
            .map(item => {
              const url = cleanMediaUrl(item.url) ?? ''
              const videoUrl = cleanMediaUrl(item.videoUrl) ?? (isVideoFile(url) ? url : undefined)
              return {
                ...item,
                url,
                poster: imagePosterUrl(item.poster, thumb, isVideoFile(url) ? null : url) ?? undefined,
                videoUrl,
              }
            })
            .filter(item => item.url || item.poster || item.videoUrl)
        )
      }
    } catch {
      /* keep fallback */
    }
  }

  const items: CollectMediaItem[] = []
  if (thumb) {
    items.push({ url: thumb, type: 'image' })
  }
  const single = cleanMediaUrl(raw && !raw.trim().startsWith('[') ? raw : null)
  if (single && single !== thumb) {
    const video = isVideoFile(single)
    items.push({
      url: single,
      type: video ? 'video' : 'image',
      poster: video ? thumb ?? undefined : undefined,
      videoUrl: video ? single : undefined,
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
