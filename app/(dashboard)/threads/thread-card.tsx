'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { GRADE_LABEL, STATUS_CLASS, STATUS_LABEL, derivePostStats, formatCount } from '@/lib/collect-labels'
import { isHashtag, parseMediaItems, splitCaption } from '@/lib/collect-media'
import { ThreadMedia } from './thread-media'
import type { CollectedPost } from '@/types'

export function ThreadCard({
  post,
  onRemoved,
}: {
  post: CollectedPost
  onRemoved?: (id: string) => void
}) {
  const router = useRouter()
  const [removing, setRemoving] = useState(false)
  const collected = post.collected_at ? new Date(post.collected_at) : null
  const date = collected ? collected.toISOString().slice(0, 10) : ''
  const shortDate = collected ? `${collected.getMonth() + 1}/${collected.getDate()}` : ''
  const stats = derivePostStats(post)
  const grade = stats.grade ? GRADE_LABEL[stats.grade] : null
  const mediaItems = parseMediaItems(post)
  const caption =
    post.caption && post.caption !== post.author && post.caption !== `@${post.author}`
      ? post.caption
      : '본문 없음'
  const initial = (post.author?.[0] ?? 'U').toUpperCase()

  async function remove() {
    if (removing) return
    if (!window.confirm('이 수집을 삭제할까요?')) return
    setRemoving(true)
    const res = await fetch(`/api/threads/posts/${post.id}`, { method: 'DELETE' })
    if (!res.ok) {
      setRemoving(false)
      return
    }
    onRemoved?.(post.id)
    router.refresh()
  }

  return (
    <article className="flex flex-col rounded-2xl border border-[var(--card-border)] bg-[#141418] p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/threads/${post.id}/edit?tab=original`}
                className="truncate text-sm font-semibold text-white hover:underline"
              >
                @{post.author || 'unknown'}
              </Link>
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[post.status]}`}>
                {STATUS_LABEL[post.status]}
              </span>
            </div>
            <p className="text-[11px] text-white/35">{date}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {grade && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
              {grade}
              {stats.multiplier != null ? ` ${Number(stats.multiplier).toFixed(1)}배` : ''}
            </span>
          )}
          <button
            type="button"
            onClick={remove}
            disabled={removing}
            className="rounded-lg border border-red-400/50 bg-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500 hover:text-white disabled:opacity-50"
          >
            {removing ? '삭제 중' : '삭제'}
          </button>
        </div>
      </div>

      <p className="mb-3 whitespace-pre-wrap text-[15px] leading-[1.45] text-[#f3f5f7]">
        {caption === '본문 없음'
          ? caption
          : splitCaption(caption).map((part, index) =>
              isHashtag(part) ? (
                <span key={`${part}-${index}`} className="text-[#1d9bf0]">
                  {part}
                </span>
              ) : (
                <span key={`${part}-${index}`}>{part}</span>
              )
            )}
      </p>

      {mediaItems.length > 0 && (
        <div className="mb-3">
          <ThreadMedia items={mediaItems} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {grade && (
          <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">
            {grade} {stats.multiplier != null ? `${Number(stats.multiplier).toFixed(1)}배` : ''}
          </span>
        )}
        <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
          조회 {formatCount(stats.views)}
        </span>
        <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-white/80">
          팔로워 {formatCount(stats.followers)}
        </span>
        <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-[11px] font-semibold text-violet-300">
          참여율 {stats.engagement != null ? `${stats.engagement.toFixed(1)}%` : '0%'}
        </span>
        <span className="rounded-full bg-orange-500/20 px-2.5 py-1 text-[11px] font-semibold text-orange-300">
          시간당 조회 {formatCount(stats.viewsPerHour)}
        </span>
        <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
          확산 {stats.spread != null ? stats.spread.toFixed(1) : '0.0'}
        </span>
        <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/70">좋아요 {formatCount(stats.likes)}</span>
        <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/70">답글 {formatCount(stats.comments)}</span>
        <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/70">리포스트 {formatCount(stats.reposts)}</span>
        <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/70">공유 {formatCount(stats.shares)}</span>
        <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/70">인용 {formatCount(stats.quotes)}</span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <p className="truncate text-[11px] text-white/40">
          팔로워 {formatCount(post.followers)} 수집 {shortDate}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
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
          <Link
            href={`/threads/${post.id}/edit?tab=rewrite`}
            className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand/90"
          >
            편집
          </Link>
        </div>
      </div>
    </article>
  )
}
