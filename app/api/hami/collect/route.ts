import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { CollectPlatform } from '@/types'

type IncomingPost = {
  platform?: CollectPlatform
  postId?: string
  url?: string
  author?: string
  authorId?: string
  caption?: string
  thumbnailUrl?: string
  mediaUrl?: string
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
  collectedBy?: string
}

function toRow(userId: string, post: IncomingPost, collectedBy?: string) {
  if (!post.platform || !post.postId) return null
  const m = post.metrics ?? {}
  return {
    user_id: userId,
    platform: post.platform,
    post_id: String(post.postId),
    url: post.url ?? null,
    author: post.author ?? null,
    author_id: post.authorId ?? null,
    caption: post.caption ?? null,
    thumbnail_url: post.thumbnailUrl ?? null,
    media_url: post.mediaUrl ?? null,
    views: m.views ?? 0,
    likes: m.likes ?? 0,
    comments: m.comments ?? 0,
    shares: m.shares ?? 0,
    reposts: m.reposts ?? 0,
    quotes: m.quotes ?? 0,
    followers: m.followers ?? 0,
    engagement_rate: m.engagementRate ?? null,
    views_per_hour: m.viewsPerHour ?? null,
    spread: m.spread ?? null,
    multiplier: m.multiplier ?? null,
    grade: m.grade ?? null,
    status: 'collected',
    collected_by: (post.collectedBy ?? collectedBy ?? '').replace(/^@/, '').toLowerCase() || null,
    collected_at: post.collectedAt ?? new Date().toISOString(),
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
  const { error } = await supabase.from('collected_posts').upsert(rows, {
    onConflict: 'user_id,platform,post_id',
  })

  if (error) {
    console.error('hami collect error:', error)
    return NextResponse.json(
      { error: error.message || '수집 저장에 실패했습니다.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, count: rows.length })
}
