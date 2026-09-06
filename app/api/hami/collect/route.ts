import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { CollectPlatform } from '@/types'
import { logActivity } from '@/lib/log'

type IncomingPost = {
  platform?: CollectPlatform
  postId?: string
  url?: string
  author?: string
  authorId?: string
  caption?: string
  thumbnailUrl?: string
  mediaUrl?: string
  views?: number
  followers?: number
  likes?: number
  comments?: number
  shares?: number
  reposts?: number
  quotes?: number
  engagementRate?: number
  viewsPerHour?: number
  spread?: number
  multiplier?: number
  performanceMultiplier?: number
  grade?: string
  metrics?: {
    views?: number
    followers?: number
    likes?: number
    comments?: number
    shares?: number
    reposts?: number
    quotes?: number
    engagementRate?: number
    viewsPerHour?: number
    spread?: number
    multiplier?: number
    grade?: string
  }
  collectedAt?: string
  createdAt?: string
  postedAt?: string
  collectedBy?: string
  mediaItems?: Array<{
    url: string
    type?: 'image' | 'video'
    poster?: string
    videoUrl?: string
  }>
}

function toFinite(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value.replace(/,/g, ''))
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function num(...values: unknown[]) {
  for (const value of values) {
    const parsed = toFinite(value)
    if (parsed != null) return parsed
  }
  return 0
}

function optNum(...values: unknown[]) {
  for (const value of values) {
    const parsed = toFinite(value)
    if (parsed != null) return parsed
  }
  return null
}

function cleanCaption(caption?: string | null, author?: string | null) {
  const text = caption?.trim()
  if (!text) return null
  if (author && (text === author || text === `@${author}`)) return null
  return text
}

function gradeFromMultiplier(multiplier: number) {
  if (multiplier >= 30) return 'explosion'
  if (multiplier >= 10) return 'strong'
  if (multiplier >= 3) return 'excellent'
  if (multiplier >= 1) return 'normal'
  return 'weak'
}

function viewsPerHourFromPostedAt(views: number, postedAt?: string | null) {
  if (!views || !postedAt) return null
  const created = Date.parse(postedAt)
  if (Number.isNaN(created)) return null
  return views / Math.max((Date.now() - created) / 3_600_000, 0.25)
}

function toRow(userId: string, post: IncomingPost, collectedBy?: string) {
  if (!post.platform || !post.postId) return null
  const m = post.metrics ?? {}
  const views = num(m.views, post.views)
  const followers = num(m.followers, post.followers)
  const postedAt = post.postedAt ?? post.createdAt ?? null
  const multiplier =
    optNum(m.multiplier, post.performanceMultiplier, post.multiplier) ??
    (views > 0 && followers > 0 ? views / followers : null)
  const grade = m.grade ?? post.grade ?? (multiplier != null ? gradeFromMultiplier(multiplier) : null)
  return {
    user_id: userId,
    platform: post.platform,
    post_id: String(post.postId),
    url: post.url ?? null,
    author: post.author ?? null,
    author_id: post.authorId ?? null,
    caption: cleanCaption(post.caption, post.author),
    thumbnail_url: post.mediaItems?.[0]?.poster ?? post.mediaItems?.[0]?.url ?? post.thumbnailUrl ?? null,
    media_url: post.mediaItems?.length
      ? JSON.stringify(
          post.mediaItems.map((item) => ({
            url: item.url,
            type: item.type === 'video' ? 'video' : 'image',
            poster: item.poster,
            videoUrl: item.videoUrl,
          }))
        )
      : post.mediaUrl ?? null,
    views,
    likes: num(m.likes, post.likes),
    comments: num(m.comments, post.comments),
    shares: num(m.shares, post.shares),
    reposts: num(m.reposts, post.reposts),
    quotes: num(m.quotes, post.quotes),
    followers,
    engagement_rate: optNum(m.engagementRate, post.engagementRate),
    views_per_hour:
      optNum(m.viewsPerHour, post.viewsPerHour) ?? viewsPerHourFromPostedAt(views, postedAt),
    spread: optNum(m.spread, post.spread),
    posted_at: postedAt,
    multiplier,
    grade,
    status: 'collected',
    collected_by: (post.collectedBy ?? collectedBy ?? '').replace(/^@/, '').toLowerCase() || null,
    collected_at: post.collectedAt ?? new Date().toISOString(),
  }
}

type CollectRow = NonNullable<ReturnType<typeof toRow>>

function keepText(next: string | null, prev: string | null | undefined) {
  return next || prev || null
}

function mediaLen(value?: string | null) {
  if (!value?.trim().startsWith('[')) return 0
  try {
    const parsed = JSON.parse(value) as unknown[]
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

function pickMediaUrl(next: string | null, prev: string | null | undefined) {
  if (mediaLen(next) > 0 || mediaLen(prev) > 0) {
    return mediaLen(next) >= mediaLen(prev) ? next : prev ?? null
  }
  return keepText(next, prev)
}

function keepCount(next: number, prev: number | null | undefined) {
  return next > 0 ? next : prev ?? 0
}

function mergeRow(next: CollectRow, prev?: Record<string, unknown> | null): CollectRow {
  if (!prev) return next
  const views = keepCount(next.views, prev.views as number)
  const followers = keepCount(next.followers, prev.followers as number)
  const multiplier =
    next.multiplier ??
    (typeof prev.multiplier === 'number' ? prev.multiplier : null) ??
    (views > 0 && followers > 0 ? views / followers : null)
  const grade =
    next.grade ??
    (typeof prev.grade === 'string' ? prev.grade : null) ??
    (multiplier != null ? gradeFromMultiplier(multiplier) : null)
  const prevStatus = typeof prev.status === 'string' ? prev.status : 'collected'
  return {
    ...next,
    caption: keepText(next.caption, prev.caption as string | null),
    thumbnail_url: keepText(next.thumbnail_url, prev.thumbnail_url as string | null),
    media_url: pickMediaUrl(next.media_url, prev.media_url as string | null),
    url: keepText(next.url, prev.url as string | null),
    author: keepText(next.author, prev.author as string | null),
    views,
    likes: Math.max(next.likes, num(prev.likes as number)),
    comments: Math.max(next.comments, num(prev.comments as number)),
    shares: Math.max(next.shares, num(prev.shares as number)),
    reposts: Math.max(next.reposts, num(prev.reposts as number)),
    quotes: Math.max(next.quotes, num(prev.quotes as number)),
    followers,
    engagement_rate: next.engagement_rate ?? optNum(prev.engagement_rate as number),
    views_per_hour:
      next.views_per_hour != null && next.views_per_hour > 0
        ? next.views_per_hour
        : optNum(prev.views_per_hour as number),
    spread: next.spread ?? optNum(prev.spread as number),
    multiplier,
    grade,
    posted_at: next.posted_at ?? (typeof prev.posted_at === 'string' ? prev.posted_at : null),
    status: prevStatus !== 'collected' ? prevStatus : next.status,
    collected_at: (prev.collected_at as string) ?? next.collected_at,
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'mostem.kr에 로그인한 뒤 수집하세요.' },
      { status: 401 }
    )
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const incoming: IncomingPost[] = Array.isArray(body.posts)
    ? body.posts
    : [body]
  const collectedBy =
    typeof body.collectedBy === 'string' ? body.collectedBy : undefined

  const rows = incoming
    .map((post) => toRow(session.user.id, post, collectedBy))
    .filter((row): row is NonNullable<typeof row> => row !== null)

  if (rows.length === 0) {
    return NextResponse.json({ error: '저장할 게시물이 없습니다.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .from('collected_posts')
    .select('*')
    .eq('user_id', session.user.id)
    .in('post_id', rows.map((row) => row.post_id))

  const prevByKey = new Map(
    (existing ?? []).map((row) => [`${row.platform}:${row.post_id}`, row])
  )
  const merged = rows.map((row) => mergeRow(row, prevByKey.get(`${row.platform}:${row.post_id}`)))

  let { error } = await supabase.from('collected_posts').upsert(merged, {
    onConflict: 'user_id,platform,post_id',
  })
  if (error && /posted_at/i.test(error.message)) {
    const withoutPosted = merged.map((row) =>
      Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'posted_at'))
    )
    const retry = await supabase.from('collected_posts').upsert(withoutPosted, {
      onConflict: 'user_id,platform,post_id',
    })
    error = retry.error
  }

  if (error) {
    console.error('hami collect error:', error)
    return NextResponse.json(
      { error: error.message || '수집 저장에 실패했습니다.' },
      { status: 500 }
    )
  }

  const { data: saved } = await supabase
    .from('collected_posts')
    .select('*')
    .eq('user_id', session.user.id)
    .in('post_id', rows.map((row) => row.post_id))

  void logActivity(
    session.user.id,
    'hami_collect',
    {
      count: merged.length,
      posts: merged.slice(0, 12).map((row) => ({
        platform: row.platform,
        author: row.author,
        caption: String(row.caption || '').slice(0, 240),
        url: row.url,
      })),
    },
    req
  )

  return NextResponse.json(
    { ok: true, count: merged.length, posts: (saved ?? merged).map(toClientPost) },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

function toClientPost(row: Record<string, unknown>) {
  return {
    platform: row.platform,
    postId: row.post_id,
    views: row.views ?? 0,
    followers: row.followers ?? 0,
    likes: row.likes ?? 0,
    comments: row.comments ?? 0,
    shares: row.shares ?? 0,
    reposts: row.reposts ?? 0,
    quotes: row.quotes ?? 0,
    engagementRate: row.engagement_rate ?? null,
    viewsPerHour: row.views_per_hour ?? null,
    spread: row.spread ?? null,
    multiplier: row.multiplier ?? null,
    grade: row.grade ?? null,
    postedAt: row.posted_at ?? null,
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const platform = url.searchParams.get('platform') ?? 'threads'
  const postId = url.searchParams.get('postId')
  if (!postId) {
    return NextResponse.json({ error: 'postId가 필요합니다.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('collected_posts')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('platform', platform)
    .eq('post_id', postId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ ok: false, saved: null }, { status: 404 })
  return NextResponse.json(
    { ok: true, saved: toClientPost(data) },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
