import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { ARCHIVE_BUCKET, cleanMediaUrl, isArchivedMediaUrl, isVideoFile } from '@/lib/collect-media'
import type { CollectMediaItem } from '@/types'

/**
 * Collected Threads/Instagram media lives on CDN links that expire after a few days (403).
 * We copy each picture/video into a public storage bucket once, then always show our copy.
 * Files are only deleted together with the post.
 */

const IMAGE_MAX = 12 * 1024 * 1024
export const VIDEO_MAX = 50 * 1024 * 1024
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

const PATH_RE = /^[A-Za-z0-9_-]{1,80}\/[A-Za-z0-9._-]{1,80}\/[a-f0-9]{32}\.(jpg|png|webp|gif|mp4|webm)$/

let bucketReady: Promise<void> | null = null

export function ensureArchiveBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const supabase = createAdminClient()
      const { data } = await supabase.storage.listBuckets()
      if (data?.some((bucket) => bucket.name === ARCHIVE_BUCKET || bucket.id === ARCHIVE_BUCKET)) return
      const { error } = await supabase.storage.createBucket(ARCHIVE_BUCKET, {
        public: true,
        fileSizeLimit: VIDEO_MAX,
      })
      if (error && !/exist/i.test(error.message)) throw new Error(error.message)
    })().catch((error) => {
      bucketReady = null
      throw error
    })
  }
  return bucketReady
}

function safeKey(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80) || 'post'
}

export function isSafeArchivePath(path: string, userId?: string) {
  if (!PATH_RE.test(path) || path.includes('..')) return false
  if (userId && !path.startsWith(`${userId}/`)) return false
  return true
}

export function archivePathFor(userId: string, postKey: string, source: string, ext: string) {
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 32)
  return `${userId}/${safeKey(postKey)}/${hash}.${ext}`
}

export function publicArchiveUrl(path: string) {
  const supabase = createAdminClient()
  return supabase.storage.from(ARCHIVE_BUCKET).getPublicUrl(path).data.publicUrl
}

type Sniffed = { ext: 'jpg' | 'png' | 'webp' | 'gif' | 'mp4' | 'webm'; contentType: string }

export function sniffMedia(buf: Buffer): Sniffed | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', contentType: 'image/jpeg' }
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: 'png', contentType: 'image/png' }
  if (buf.length >= 6 && buf.toString('ascii', 0, 3) === 'GIF') return { ext: 'gif', contentType: 'image/gif' }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { ext: 'webp', contentType: 'image/webp' }
  }
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') return { ext: 'mp4', contentType: 'video/mp4' }
  if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return { ext: 'webm', contentType: 'video/webm' }
  }
  return null
}

/** Save bytes we already have (uploaded by the extension). Returns the public URL. */
export async function saveArchiveBytes(userId: string, postKey: string, sourceKey: string, buf: Buffer) {
  const kind = sniffMedia(buf)
  if (!kind) return null
  await ensureArchiveBucket()
  const path = archivePathFor(userId, postKey, sourceKey, kind.ext)
  if (!isSafeArchivePath(path, userId)) return null
  const supabase = createAdminClient()
  const { error } = await supabase.storage.from(ARCHIVE_BUCKET).upload(path, buf, {
    contentType: kind.contentType,
    upsert: true,
    cacheControl: '31536000',
  })
  if (error) return null
  return publicArchiveUrl(path)
}

async function downloadRemote(url: string, maxBytes: number) {
  const res = await fetch(url, {
    headers: { Referer: 'https://www.threads.net/', Origin: 'https://www.threads.net', Accept: '*/*', 'User-Agent': UA },
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) return null
  const declared = Number(res.headers.get('content-length') || 0)
  if (declared > maxBytes) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.byteLength < 32 || buf.byteLength > maxBytes) return null
  return buf
}

/** Strip the signature/expiry query so the same file always maps to the same storage path. */
function sourceKeyOf(url: string) {
  try {
    const parsed = new URL(url)
    return `${parsed.hostname}${parsed.pathname}`
  } catch {
    return url
  }
}

async function saveRemote(userId: string, postKey: string, url: string, maxBytes: number) {
  const buf = await downloadRemote(url, maxBytes).catch(() => null)
  if (!buf) return null
  return saveArchiveBytes(userId, postKey, sourceKeyOf(url), buf)
}

/**
 * Replace every CDN link in `items` by our stored copy (where the CDN still answers).
 * Links that are already archived are kept; links that fail stay as they were.
 */
export async function archiveMediaItems(
  userId: string,
  postKey: string,
  items: CollectMediaItem[],
  options?: { videos?: boolean },
) {
  const withVideos = options?.videos !== false
  const cache = new Map<string, Promise<string | undefined>>()

  function keep(url: string | undefined, kind: 'image' | 'video') {
    const clean = cleanMediaUrl(url)
    if (!clean) return Promise.resolve(undefined)
    if (isArchivedMediaUrl(clean)) return Promise.resolve(clean)
    if (kind === 'image' && isVideoFile(clean)) return Promise.resolve(undefined)
    if (kind === 'video' && (!withVideos || clean.includes('.m3u8'))) return Promise.resolve(clean)
    const key = `${kind}:${clean}`
    let hit = cache.get(key)
    if (!hit) {
      hit = saveRemote(userId, postKey, clean, kind === 'video' ? VIDEO_MAX : IMAGE_MAX).then((saved) => saved ?? clean)
      cache.set(key, hit)
    }
    return hit
  }

  return Promise.all(
    items.map(async (item) => {
      const videoSource = cleanMediaUrl(item.videoUrl) ?? (item.type === 'video' ? cleanMediaUrl(item.url) : null)
      const [poster, image, videoUrl] = await Promise.all([
        keep(item.poster ?? (item.type === 'image' ? item.url : undefined), 'image'),
        item.type === 'video' ? Promise.resolve(undefined) : keep(item.url, 'image'),
        videoSource ? keep(videoSource, 'video') : Promise.resolve(undefined),
      ])
      const url = item.type === 'video' ? videoUrl || videoSource || item.url : image || poster || item.url
      return {
        url: url || poster || videoUrl || item.url,
        type: item.type === 'video' || videoUrl ? 'video' : 'image',
        poster: poster && !isVideoFile(poster) ? poster : undefined,
        videoUrl: videoUrl || undefined,
      } satisfies CollectMediaItem
    }),
  )
}

/** Remove a post's stored files (called when the post is deleted). */
export async function deleteArchivedPost(userId: string, postKey: string) {
  const supabase = createAdminClient()
  const prefix = `${userId}/${safeKey(postKey)}`
  const { data } = await supabase.storage.from(ARCHIVE_BUCKET).list(prefix, { limit: 100 })
  if (!data?.length) return
  await supabase.storage.from(ARCHIVE_BUCKET).remove(data.map((file) => `${prefix}/${file.name}`))
}
