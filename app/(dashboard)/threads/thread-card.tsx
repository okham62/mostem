import { GRADE_LABEL, STATUS_LABEL } from '@/lib/collect-labels'
import type { CollectedPost } from '@/types'

function formatNum(value?: number | null) {
  if (value == null) return '0'
  if (value >= 10000) return `${(value / 10000).toFixed(1)}만`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}천`
  return String(value)
}

export function ThreadCard({ post }: { post: CollectedPost }) {
  const date = post.collected_at ? new Date(post.collected_at).toISOString().slice(0, 10) : ''
  const grade = post.grade ? GRADE_LABEL[post.grade] : null

  return (
    <article className="flex flex-col rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">@{post.author || 'unknown'}</p>
          <p className="text-[11px] text-white/35">{date}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/70">
            {STATUS_LABEL[post.status]}
          </span>
          {grade && post.multiplier != null && (
            <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-semibold text-brand">
              {grade} {Number(post.multiplier).toFixed(1)}배
            </span>
          )}
        </div>
      </div>

      {post.thumbnail_url && (
        <img
          src={post.thumbnail_url}
          alt=""
          className="mb-3 h-36 w-full rounded-xl object-cover"
        />
      )}

      <p className="mb-3 line-clamp-4 flex-1 text-sm leading-relaxed text-white/75">
        {post.caption || '본문 없음'}
      </p>

      <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-black/30 p-2 text-center text-[10px] text-white/50">
        <div>조회 {formatNum(post.views)}</div>
        <div>좋아요 {formatNum(post.likes)}</div>
        <div>답글 {formatNum(post.comments)}</div>
        <div>리포스트 {formatNum(post.reposts)}</div>
        <div>공유 {formatNum(post.shares)}</div>
        <div>인용 {formatNum(post.quotes)}</div>
      </div>

      <div className="flex items-center justify-between">
        <p className="truncate text-[11px] text-white/35">
          원문 @{post.author || ''}
          {post.collected_by ? ` · 수집 @${post.collected_by}` : ''}
        </p>
        {post.url && (
          <a
            href={post.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-white/8 px-2.5 py-1 text-[11px] text-white/70 hover:bg-white/12"
          >
            원본
          </a>
        )}
      </div>
    </article>
  )
}
