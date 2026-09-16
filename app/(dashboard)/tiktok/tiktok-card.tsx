'use client'

import { ExternalLink, Heart, MessageCircle, Share2 } from 'lucide-react'
import { derivePostStats, formatCount, GRADE_LABEL } from '@/lib/collect-labels'
import { parseMediaItems } from '@/lib/collect-media'
import { platformPermalink } from '@/lib/platform-permalink'
import { MediaDownloadButtons } from '@/app/(dashboard)/threads/media-download-buttons'
import { StatusForceBadge } from '@/app/(dashboard)/threads/status-force-badge'
import { ThreadMedia } from '@/app/(dashboard)/threads/thread-media'
import type { CollectedPost } from '@/types'

export function TikTokCard({
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
    platform: 'tiktok',
    url: post.url,
    author: post.author,
    postId: post.post_id,
  })
  const caption =
    post.caption && post.caption !== post.author && post.caption !== `@${post.author}`
      ? post.caption
      : ''
  const initial = (post.author?.[0] ?? 'U').toUpperCase()

  function remove() {
    onRemoved?.(post.id)
    void fetch(`/api/threads/posts/${post.id}`, { method: 'DELETE' })
  }

  return (
    <article className="relative mx-auto flex h-full w-full max-w-[320px] flex-col overflow-hidden rounded-[22px] border border-white/10 bg-black shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      {/* 9:16 phone rail */}
      <div className="relative aspect-[9/16] w-full bg-black">
        {mediaItems.length ? (
          <ThreadMedia items={mediaItems} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-white/30">미디어 없음</div>
        )}

        {/* Right action rail */}
        <div className="pointer-events-none absolute bottom-24 right-2 z-10 flex flex-col items-center gap-4 text-white">
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur">
              <Heart className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold">{formatCount(post.likes)}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold">{formatCount(post.comments)}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur">
              <Share2 className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold">{formatCount(post.shares || post.reposts)}</span>
          </div>
        </div>

        {/* Bottom caption overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-16">
          <div className="pointer-events-auto mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#25F4EE] to-[#FE2C55] text-xs font-bold text-black">
                {initial}
              </div>
              <p className="truncate text-sm font-bold text-white">@{post.author || 'unknown'}</p>
            </div>
            <StatusForceBadge post={post} onUpdated={onUpdated} />
          </div>
          {caption ? <p className="line-clamp-3 text-[13px] leading-snug text-white/90">{caption}</p> : null}
          <p className="mt-1 text-[10px] text-white/45">
            조회 {formatCount(post.views)}
            {stats.grade ? ` · ${GRADE_LABEL[stats.grade]}` : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2">
        <a
          href={originalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-white/50 hover:text-white"
        >
          TikTok에서 보기 <ExternalLink className="h-3 w-3" />
        </a>
        <div className="flex items-center gap-1">
          <MediaDownloadButtons author={post.author} postId={post.post_id} items={mediaItems} />
          <button
            type="button"
            onClick={remove}
            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-red-300/80 hover:bg-red-500/20"
          >
            삭제
          </button>
        </div>
      </div>
    </article>
  )
}
