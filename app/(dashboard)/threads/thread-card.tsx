'use client'

import { ExternalLink } from 'lucide-react'
import { GRADE_LABEL, derivePostStats, formatCount, formatMultiplier } from '@/lib/collect-labels'
import { isHashtag, parseMediaItems, splitCaption } from '@/lib/collect-media'
import { openThreadEdit } from '@/lib/open-thread-edit'
import {
  clearStoredSchedule,
  formatScheduleCardDate,
  resolveScheduledAt,
} from '@/lib/post-schedule'
import { MediaDownloadButtons } from './media-download-buttons'
import { StatusForceBadge } from './status-force-badge'
import { ThreadMedia } from './thread-media'
import type { CollectedPost } from '@/types'

export function ThreadCard({
  post,
  onRemoved,
  onUpdated,
}: {
  post: CollectedPost
  onRemoved?: (id: string) => void
  onUpdated?: (post: CollectedPost) => void
}) {
  const scheduled = post.status === 'scheduled'
  const scheduleIso = resolveScheduledAt(post)
  const scheduleAt = scheduleIso ? new Date(scheduleIso) : null
  const collected = post.collected_at ? new Date(post.collected_at) : null
  const date =
    scheduled && scheduleAt && !Number.isNaN(scheduleAt.getTime())
      ? formatScheduleCardDate(scheduleIso!)
      : collected
        ? collected.toISOString().slice(0, 10)
        : ''
  const shortDate = collected ? `${collected.getMonth() + 1}/${collected.getDate()}` : ''
  const stats = derivePostStats(post)
  const grade = stats.grade ? GRADE_LABEL[stats.grade] : null
  const mediaItems = parseMediaItems(post)
  const caption =
    post.caption && post.caption !== post.author && post.caption !== `@${post.author}`
      ? post.caption
      : '본문 없음'
  const initial = (post.author?.[0] ?? 'U').toUpperCase()
  const captionNodes =
    caption === '본문 없음'
      ? caption
      : splitCaption(caption).map((part, index) =>
          isHashtag(part) ? (
            <span key={`${part}-${index}`} className="text-[#1d9bf0]">
              {part}
            </span>
          ) : (
            <span key={`${part}-${index}`}>{part}</span>
          ),
        )

  function remove() {
    if (onRemoved) {
      onRemoved(post.id)
      return
    }
    void fetch(`/api/threads/posts/${post.id}`, { method: 'DELETE' })
  }

  async function cancelSchedule() {
    const next = { ...post, status: 'ready' as const, scheduled_at: null }
    onUpdated?.(next)
    clearStoredSchedule(post.id)
    const res = await fetch(`/api/threads/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ready', scheduled_at: null }),
    })
    if (!res.ok) {
      onUpdated?.(post)
    }
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-[var(--card-border)] bg-[#141418] p-4">
      <div className="relative z-10 mb-3 flex min-h-9 items-start justify-between gap-2 overflow-visible">
        <div className="flex min-w-0 items-center gap-2.5 overflow-visible">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
            {initial}
          </div>
          <div className="min-w-0 overflow-visible">
            <div className="flex items-center gap-1.5 overflow-visible">
              <button
                type="button"
                onClick={() => openThreadEdit(post.id, 'original')}
                className="truncate text-sm font-semibold text-white hover:underline"
              >
                @{post.author || 'unknown'}
              </button>
              <StatusForceBadge post={post} onUpdated={onUpdated} />
            </div>
            <p className="text-[11px] text-white/35">{date}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {scheduled ? (
            <button
              type="button"
              onClick={() => void cancelSchedule()}
              className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/30 hover:text-white"
            >
              예약 취소
            </button>
          ) : null}
          <button
            type="button"
            onClick={remove}
            className="rounded-lg border border-red-400/50 bg-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500 hover:text-white"
          >
            삭제
          </button>
        </div>
      </div>

      <div className="group/caption relative mb-3 h-[44px]">
        <p
          className="whitespace-pre-wrap break-words text-[15px] leading-[1.45] text-[#f3f5f7]"
          style={{
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflow: 'hidden',
          }}
        >
          {captionNodes}
        </p>
        <div className="invisible absolute -left-2 -top-2 z-30 w-[calc(100%+1rem)] max-h-[320px] overflow-y-auto rounded-xl border border-white/15 bg-[#1b1b21] p-3 text-[15px] leading-[1.45] text-[#f3f5f7] opacity-0 shadow-2xl transition-opacity duration-100 group-hover/caption:visible group-hover/caption:opacity-100">
          <p className="whitespace-pre-wrap break-words">{captionNodes}</p>
        </div>
      </div>

      <div className="mb-3 aspect-[8/5] w-full overflow-hidden rounded-2xl">
        {mediaItems.length > 0 ? (
          <ThreadMedia items={mediaItems} />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-2xl border border-white/10 bg-[#101014] text-[11px] text-white/25">
            미디어 없음
          </div>
        )}
      </div>

      <div className="mostem-metrics mb-4 space-y-1.5">
        <div className="mostem-metrics-row" data-cols="6">
          <span className={`mostem-pill mostem-pill-grade-${stats.grade ?? 'aggregating'}`}>
            {grade ? `${grade} ${formatMultiplier(stats.multiplier)}` : '집계중 …'}
          </span>
          <span className="mostem-pill mostem-pill-views">조회 {formatCount(stats.views)}</span>
          <span className="mostem-pill mostem-pill-followers">팔로워 {formatCount(stats.followers)}</span>
          <span className="mostem-pill mostem-pill-engagement">
            참여율 {stats.engagement != null ? `${stats.engagement.toFixed(1)}%` : '0%'}
          </span>
          <span className="mostem-pill mostem-pill-vph">시간당 {formatCount(stats.viewsPerHour)}</span>
          <span className="mostem-pill mostem-pill-spread">
            확산 {stats.spread != null ? stats.spread.toFixed(1) : '0.0'}
          </span>
        </div>
        <div className="mostem-metrics-row" data-cols="5">
          <span className="mostem-pill mostem-pill-plain">좋아요 {formatCount(stats.likes)}</span>
          <span className="mostem-pill mostem-pill-plain">답글 {formatCount(stats.comments)}</span>
          <span className="mostem-pill mostem-pill-plain">리포스트 {formatCount(stats.reposts)}</span>
          <span className="mostem-pill mostem-pill-plain">공유 {formatCount(stats.shares)}</span>
          <span className="mostem-pill mostem-pill-plain">인용 {formatCount(stats.quotes)}</span>
        </div>
      </div>

      <div className="mb-2">
        <MediaDownloadButtons author={post.author} postId={post.post_id} items={mediaItems} layout="stack" />
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <p className="truncate text-[11px] text-white/40">
          팔로워 {formatCount(post.followers)} · 수집 {shortDate}
        </p>
        <div className="flex shrink-0 items-center justify-end gap-1.5">
          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-white/50 hover:bg-white/5 hover:text-white"
            >
              <ExternalLink className="h-3 w-3" />
              원본
            </a>
          )}
          <button
            type="button"
            onClick={() => openThreadEdit(post.id, 'rewrite')}
            className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand/90"
          >
            편집
          </button>
        </div>
      </div>
    </article>
  )
}
