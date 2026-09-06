import type { CollectMediaItem, CollectedPost } from '@/types'
import { parseMediaItems, serializeMediaItems } from '@/lib/collect-media'

function firstUrl(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  const obj = value as Record<string, unknown>
  if (typeof obj.url === 'string' && obj.url.startsWith('http')) return obj.url
  const candidates = obj.candidates
  if (Array.isArray(candidates) && candidates[0] && typeof candidates[0] === 'object') {
    const url = (candidates[0] as { url?: string }).url
    if (url?.startsWith('http')) return url
  }
  return undefined
}

function itemFromNode(raw: Record<string, unknown>): CollectMediaItem | null {
  const image =
    firstUrl(raw.image_versions2) ??
    firstUrl(raw.image_versions) ??
    firstUrl(raw.imageVersions2)
  const versions = raw.video_versions ?? raw.videoVersions
  const video =
    (Array.isArray(versions) && firstUrl(versions[0])) ||
    (typeof raw.video_url === 'string' ? raw.video_url : undefined)
  if (!image && !video) return null
  return {
    url: image ?? video ?? '',
    type: video ? 'video' : 'image',
    poster: image,
    videoUrl: video,
  }
}

function parseCarouselArrays(html: string): CollectMediaItem[] {
  const key = '"carousel_media":['
  let best: CollectMediaItem[] = []
  let pos = 0
  while ((pos = html.indexOf(key, pos)) !== -1) {
    let depth = 0
    let end = -1
    for (let i = pos + key.length - 1; i < html.length && i < pos + 400_000; i += 1) {
      const ch = html[i]
      if (ch === '[') depth += 1
      else if (ch === ']') {
        depth -= 1
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    if (end > 0) {
      try {
        const arr = JSON.parse(html.slice(pos + key.length - 1, end + 1)) as unknown[]
        const items = arr
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
          .map(itemFromNode)
          .filter((item): item is CollectMediaItem => Boolean(item))
        if (items.length > best.length) best = items
      } catch {
        /* keep scanning */
      }
    }
    pos += key.length
  }
  return best
}

export async function fetchThreadsPostMedia(url: string): Promise<CollectMediaItem[]> {
  const target = url.replace('://www.threads.net/', '://www.threads.com/')
  const res = await fetch(target, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html',
    },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const html = await res.text()
  return parseCarouselArrays(html)
}

export function mergeRemoteMedia(post: CollectedPost, remote: CollectMediaItem[]) {
  const local = parseMediaItems(post)
  if (remote.length <= local.length) return { items: local, changed: false as const }
  return { items: remote, changed: true as const, serialized: serializeMediaItems(remote) }
}
