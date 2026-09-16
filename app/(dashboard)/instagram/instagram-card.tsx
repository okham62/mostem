'use client'

import { ExternalLink, Heart, MessageCircle, Bookmark, Send } from 'lucide-react'
import { derivePostStats, formatCount, GRADE_LABEL } from '@/lib/collect-labels'
import { isHashtag, parseMediaItems, splitCaption } from '@/lib/collect-media'
import { platformPermalink } from '@/lib/platform-permalink'
import { MediaDownloadButtons } from '@/app/(dashboard)/threads/media-download-buttons'
import { StatusForceBadge } from '@/app/(dashboard)/threads/status-force-badge'
import { ThreadMedia } from '@/app/(dashboard)/threads/thread-media'
import type { CollectedPost } from '@/types'

export function InstagramCard({
  post,
  onRemoved,
  onUpdated,
}: {
  post: CollectedPost
  onRemoved?: (id: string) => void
  onUpdated?: (post: CollectedPost) => void
}) {
  const stats = derivePostStats(post)
  const mediaItems = parseMediaItems(post)
  const originalUrl = platformPermalink({
    platform: 'instagram',
    url: post.url,
    author: post.author,
    postId: post.post_id,
  })
  const caption =
    post.caption && post.caption !== post.author && post.caption !== `@${post.author}`
      ? post.caption
      : ''
  const initial = (post.author?.[0] ?? 'U').toUpperCase()
  const collected = post.collected_at ? new Date(post.collected_at) : null
  const date = collected ? collected.toISOString().slice(0, 10) : ''

  function remove() {
    onRemoved?.(post.id)
    void fetch(`/api/threads/posts/${post.id}`, { method: 'DELETE' })
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]">
      {/* IG header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] p-[2px]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0a0a0a] text-xs font-bold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#833ab4] to-[#fd1d1d]">
                {initial}
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{post.author || 'unknown'}</p>
            <p className="text-[10px] text-white/35">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusForceBadge post={post} onUpdated={onUpdated} />
          <button
            type="button"
            onClick={remove}
            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-red-300/80 hover:bg-red-500/20 hover:text-red-200"
          >
            삭제
          </button>
        </div>
      </div>

      {/* Square / portrait feed media */}
      <div className="aspect-square w-full bg-black sm:aspect-[4/5]">
        {mediaItems.length ? (
          <ThreadMedia items={mediaItems} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-white/30">미디어 없음</div>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between px-3 pt-2.5">
        <div className="flex items-center gap-3 text-white">
          <Heart className="h-5 w-5" />
          <MessageCircle className="h-5 w-5" />
          <Send className="h-5 w-5" />
        </div>
        <Bookmark className="h-5 w-5 text-white" />
      </div>

      <div className="space-y-1.5 px-3 pb-3 pt-2">
        <p className="text-sm font-semibold text-white">
          좋아요 {formatCount(post.likes)} · 댓글 {formatCount(post.comments)}
          {post.views ? ` · 조회 ${formatCount(post.views)}` : ''}
        </p>
        {stats.grade ? (
          <p className="text-[11px] text-white/45">
            {GRADE_LABEL[stats.grade]}
            {stats.multiplier != null ? ` · ${Number(stats.multiplier).toFixed(1)}배` : ''}
          </p>
        ) : null}
        {caption ? (
          <p className="line-clamp-3 text-sm leading-snug text-white/85">
            <span className="font-semibold">{post.author} </span>
            {splitCaption(caption).map((part, index) =>
              isHashtag(part) ? (
                <span key={`${part}-${index}`} className="text-[#e0f1ff]">
                  {part}
                </span>
              ) : (
                <span key={`${part}-${index}`}>{part}</span>
              )
            )}
          </p>
        ) : null}
        <div className="flex items-center gap-2 pt-1">
          <a
            href={originalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-white/45 hover:text-white"
          >
            Instagram에서 보기 <ExternalLink className="h-3 w-3" />
          </a>
          <MediaDownloadButtons author={post.author} postId={post.post_id} items={mediaItems} />
        </div>
      </div>
    </article>
  )
}
