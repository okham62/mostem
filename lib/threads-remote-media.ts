import type { CollectMediaItem, CollectedPost } from '@/types'
import { parseMediaItems, serializeMediaItems } from '@/lib/collect-media'
import { threadsPermalink } from '@/lib/threads-permalink'

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

function parseSingleMedia(html: string): CollectMediaItem[] {
  const imageMatch = html.match(/"image_versions2"\s*:\s*\{[\s\S]{0,4000}?"url"\s*:\s*"(https:[^"]+)"/)
  const videoMatch = html.match(/"video_versions"\s*:\s*\[[\s\S]{0,2000}?"url"\s*:\s*"(https:[^"]+)"/)
  const image = imageMatch?.[1]?.replace(/\\u0026/g, '&')
  const video = videoMatch?.[1]?.replace(/\\u0026/g, '&')
  if (!image && !video) return []
  return [
    {
      url: image ?? video ?? '',
      type: video ? 'video' : 'image',
      poster: image,
      videoUrl: video,
    },
  ]
}

function unescapeJsonString(value: string) {
  return value
    .replace(/\\u0026/g, '&')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

function parseAuthorNearCode(html: string, postId: string): string | null {
  const escaped = postId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const idx = html.search(new RegExp(`"code"\\s*:\\s*"${escaped}"`, 'i'))
  const chunk = idx >= 0 ? html.slice(Math.max(0, idx - 8_000), idx + 12_000) : html.slice(0, 80_000)
  const user =
    chunk.match(/"username"\s*:\s*"([^"]{2,64})"/)?.[1] ||
    chunk.match(/"user"\s*:\s*\{[^}]{0,400}?"username"\s*:\s*"([^"]{2,64})"/)?.[1]
  return user || null
}

function parseCaptionNearCode(html: string, postId: string): string | null {
  const escaped = postId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const idx = html.search(new RegExp(`"code"\\s*:\\s*"${escaped}"`, 'i'))
  const chunk = idx >= 0 ? html.slice(idx, idx + 30_000) : html.slice(0, 80_000)
  const candidates = [
    ...chunk.matchAll(/"text"\s*:\s*"((?:\\.|[^"\\]){2,8000})"/g),
    ...chunk.matchAll(/"caption"\s*:\s*\{[^}]{0,200}?"text"\s*:\s*"((?:\\.|[^"\\]){2,8000})"/g),
  ]
  let best = ''
  for (const match of candidates) {
    const text = unescapeJsonString(match[1]).trim()
    if (text.length > best.length) best = text
  }
  return best || null
}

export type ThreadsRemoteDetails = {
  ok: boolean
  status?: number
  author?: string | null
  caption?: string | null
  mediaItems: CollectMediaItem[]
  error?: string
}

export async function fetchThreadsPostDetails(
  url: string,
  postId?: string | null,
): Promise<ThreadsRemoteDetails> {
  const target = url.replace('://www.threads.net/', '://www.threads.com/')
  try {
    const res = await fetch(target, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
      cache: 'no-store',
      redirect: 'follow',
    })
    if (res.status === 429) {
      return { ok: false, status: 429, mediaItems: [], error: 'Threads 요청이 너무 많아요 (429). 잠시 후 다시 시도하세요.' }
    }
    if (!res.ok) {
      return { ok: false, status: res.status, mediaItems: [], error: `Threads 응답 ${res.status}` }
    }
    const html = await res.text()
    const code = postId || target.match(/\/(?:post|p|t)\/([^/?#]+)/i)?.[1] || ''
    const carousel = parseCarouselArrays(html)
    const mediaItems = carousel.length ? carousel : parseSingleMedia(html)
    return {
      ok: true,
      status: res.status,
      author: code ? parseAuthorNearCode(html, code) : null,
      caption: code ? parseCaptionNearCode(html, code) : null,
      mediaItems,
    }
  } catch (error) {
    return {
      ok: false,
      mediaItems: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function fetchThreadsPostMedia(url: string): Promise<CollectMediaItem[]> {
  const details = await fetchThreadsPostDetails(url)
  return details.mediaItems
}

export function mergeRemoteMedia(post: CollectedPost, remote: CollectMediaItem[]) {
  const local = parseMediaItems(post)
  if (remote.length <= local.length) return { items: local, changed: false as const }
  return { items: remote, changed: true as const, serialized: serializeMediaItems(remote) }
}

export function repairUrlForFetch(post: CollectedPost): string | null {
  return threadsPermalink({
    url: post.url,
    author: post.author,
    postId: post.post_id,
  })
}
