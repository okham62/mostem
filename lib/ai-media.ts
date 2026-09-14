import 'server-only'
import { isVideoFile } from '@/lib/collect-media'

const ALLOWED_HOSTS = [
  'cdninstagram.com',
  'fbcdn.net',
  'fbcdn.com',
  'threads.net',
  'threads.com',
  'instagram.com',
]

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_VIDEO_BYTES = 12 * 1024 * 1024
const MAX_IMAGES = 6
const MAX_VIDEOS = 1
const FETCH_MS = 20_000

export type RewriteMediaInput = {
  url?: string | null
  type?: 'image' | 'video' | string | null
  poster?: string | null
  videoUrl?: string | null
}

export type GeminiMediaPart =
  | { type: 'image'; data: string; mime_type: string }
  | { type: 'video'; data: string; mime_type: string }

function hostAllowed(url: URL) {
  const host = url.hostname.toLowerCase()
  return ALLOWED_HOSTS.some((ok) => host === ok || host.endsWith(`.${ok}`))
}

function guessMime(url: string, contentType: string | null, kind: 'image' | 'video') {
  const raw = (contentType || '').split(';')[0]?.trim().toLowerCase()
  if (raw && raw !== 'application/octet-stream') return raw
  if (kind === 'video') {
    if (/\.webm(\?|$)/i.test(url)) return 'video/webm'
    if (/\.mov(\?|$)/i.test(url)) return 'video/quicktime'
    return 'video/mp4'
  }
  if (/\.png(\?|$)/i.test(url)) return 'image/png'
  if (/\.webp(\?|$)/i.test(url)) return 'image/webp'
  if (/\.gif(\?|$)/i.test(url)) return 'image/gif'
  return 'image/jpeg'
}

async function fetchBytes(url: string, kind: 'image' | 'video', maxBytes: number) {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !hostAllowed(parsed)) return null

  const res = await fetch(parsed.toString(), {
    headers: {
      Referer: 'https://www.threads.net/',
      Origin: 'https://www.threads.net',
      Accept:
        kind === 'video'
          ? 'video/mp4,video/webm,video/*,*/*;q=0.8'
          : 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'User-Agent': UA,
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_MS),
    cache: 'no-store',
  }).catch(() => null)

  if (!res?.ok) return null
  const length = Number(res.headers.get('content-length') || 0)
  if (length > maxBytes) return null

  const buffer = Buffer.from(await res.arrayBuffer())
  if (!buffer.length || buffer.length > maxBytes) return null

  return {
    data: buffer.toString('base64'),
    mime_type: guessMime(url, res.headers.get('content-type'), kind),
  }
}

function isVideoInput(item: RewriteMediaInput) {
  if (item.type === 'video') return true
  const direct = item.videoUrl || item.url || ''
  return !!direct && isVideoFile(direct)
}

/** Download post media for Gemini. Oversized videos fall back to posters. */
export async function loadGeminiMediaParts(items: RewriteMediaInput[]): Promise<GeminiMediaPart[]> {
  const parts: GeminiMediaPart[] = []
  let images = 0
  let videos = 0
  const seen = new Set<string>()

  for (const item of items) {
    if (parts.length >= MAX_IMAGES + MAX_VIDEOS) break

    if (isVideoInput(item) && videos < MAX_VIDEOS) {
      const videoUrl = item.videoUrl || item.url
      const canInlineVideo = videoUrl && !/\.m3u8(\?|$)/i.test(videoUrl)
      if (canInlineVideo && !seen.has(videoUrl)) {
        seen.add(videoUrl)
        const video = await fetchBytes(videoUrl, 'video', MAX_VIDEO_BYTES)
        if (video) {
          parts.push({ type: 'video', data: video.data, mime_type: video.mime_type })
          videos += 1
          continue
        }
      }
      const poster = item.poster
      if (poster && !seen.has(poster) && images < MAX_IMAGES) {
        seen.add(poster)
        const image = await fetchBytes(poster, 'image', MAX_IMAGE_BYTES)
        if (image) {
          parts.push({ type: 'image', data: image.data, mime_type: image.mime_type })
          images += 1
        }
      }
      continue
    }

    const imageUrl = item.url || item.poster
    if (!imageUrl || seen.has(imageUrl) || images >= MAX_IMAGES) continue
    seen.add(imageUrl)
    const image = await fetchBytes(imageUrl, 'image', MAX_IMAGE_BYTES)
    if (image) {
      parts.push({ type: 'image', data: image.data, mime_type: image.mime_type })
      images += 1
    }
  }

  return parts
}
