import { auth } from '@/auth'
import {
  cleanMediaUrl,
  isArchivedMediaUrl,
  mediaHasArchive,
  mediaNeedsArchive,
  parseMediaItems,
  serializeMediaItems,
} from '@/lib/collect-media'
import { archiveMediaItems } from '@/lib/collected-media-store'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { CollectMediaItem, CollectedPost } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BATCH = 4

/** CDN links carry their expiry as hex seconds in `oe=`. */
function linkExpired(url?: string | null) {
  const clean = cleanMediaUrl(url)
  if (!clean || isArchivedMediaUrl(clean)) return false
  const oe = clean.match(/[?&]oe=([0-9A-Fa-f]{6,10})/)?.[1]
  if (!oe) return false
  return parseInt(oe, 16) * 1000 < Date.now() + 60_000
}

function allLinksExpired(items: CollectMediaItem[]) {
  const links = items.flatMap((item) => [item.poster, item.videoUrl, item.url]).filter((url) => cleanMediaUrl(url) && !isArchivedMediaUrl(url))
  return links.length > 0 && links.every(linkExpired)
}

function cleanItems(raw: unknown): CollectMediaItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, 10)
    .map((row) => {
      const item = (row ?? {}) as Record<string, unknown>
      const url = cleanMediaUrl(typeof item.url === 'string' ? item.url : null) ?? ''
      const poster = cleanMediaUrl(typeof item.poster === 'string' ? item.poster : null) ?? undefined
      const videoUrl = cleanMediaUrl(typeof item.videoUrl === 'string' ? item.videoUrl : null) ?? undefined
      return { url: url || poster || videoUrl || '', type: item.type === 'video' || videoUrl ? 'video' : 'image', poster, videoUrl } as CollectMediaItem
    })
    .filter((item) => item.url)
}

async function save(userId: string, post: CollectedPost, current: CollectMediaItem[], next: CollectMediaItem[]) {
  const serialized = serializeMediaItems(next)
  if (!serialized || serialized === serializeMediaItems(current)) return false
  // Never replace stored copies with fewer stored copies.
  if (mediaHasArchive(current) && !mediaHasArchive(next)) return false
  const thumbnail =
    next.find((item) => isArchivedMediaUrl(item.poster))?.poster ??
    next.find((item) => item.type === 'image' && isArchivedMediaUrl(item.url))?.url ??
    next[0]?.poster ??
    post.thumbnail_url
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('collected_posts')
    .update({ media_url: serialized, thumbnail_url: thumbnail })
    .eq('id', post.id)
    .eq('user_id', userId)
  return !error
}

/**
 * POST {}                         → copy media of posts whose CDN links still work (a few per call)
 * POST { posts: [{ id, items }] } → fresh links the Hami extension read with the logged-in session
 * Returns the posts whose links are already dead (`expired`) so the board can ask the extension.
 */
export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { posts?: Array<{ id?: string; items?: unknown }> }
  const supabase = createAdminClient()
  const out: Array<{ id: string; media_url: string; thumbnail_url: string | null }> = []

  if (Array.isArray(body.posts) && body.posts.length) {
    const fresh = body.posts.slice(0, BATCH).filter((row) => typeof row.id === 'string')
    const { data } = await supabase
      .from('collected_posts')
      .select('*')
      .eq('user_id', userId)
      .in('id', fresh.map((row) => row.id as string))
    const byId = new Map(((data ?? []) as CollectedPost[]).map((post) => [post.id, post]))
    await Promise.all(
      fresh.map(async (row) => {
        const post = byId.get(row.id as string)
        const items = cleanItems(row.items)
        if (!post || !items.length) return
        const current = parseMediaItems(post)
        const next = await archiveMediaItems(userId, post.post_id, items).catch(() => items)
        if (!mediaHasArchive(next)) return
        if (await save(userId, post, current, next)) {
          out.push({ id: post.id, media_url: serializeMediaItems(next)!, thumbnail_url: next[0]?.poster ?? null })
        }
      }),
    )
    return NextResponse.json({ ok: true, saved: out.length, posts: out })
  }

  const { data, error } = await supabase
    .from('collected_posts')
    .select('*')
    .eq('user_id', userId)
    .in('platform', ['threads', 'instagram'])
    .order('collected_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const needing = ((data ?? []) as CollectedPost[]).filter((post) => mediaNeedsArchive(parseMediaItems(post)))
  const expired = needing.filter((post) => allLinksExpired(parseMediaItems(post)))
  const live = needing.filter((post) => !expired.includes(post)).slice(0, BATCH)

  const stillDead: string[] = []
  await Promise.all(
    live.map(async (post) => {
      const current = parseMediaItems(post)
      const next = await archiveMediaItems(userId, post.post_id, current).catch(() => current)
      if (!mediaHasArchive(next)) {
        stillDead.push(post.id)
        return
      }
      if (await save(userId, post, current, next)) {
        out.push({ id: post.id, media_url: serializeMediaItems(next)!, thumbnail_url: next[0]?.poster ?? null })
      }
    }),
  )

  const remaining = Math.max(0, needing.length - expired.length - live.length)
  return NextResponse.json({
    ok: true,
    saved: out.length,
    posts: out,
    remaining,
    // Links already gone: only the logged-in extension can read fresh ones.
    expired: [...expired.map((post) => post.id), ...stillDead].map((id) => {
      const post = needing.find((row) => row.id === id)!
      return { id, url: post.url, author: post.author, postId: post.post_id }
    }),
  })
}
