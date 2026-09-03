import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { GRADE_LABEL, STATUS_CLASS, STATUS_LABEL, formatCount, mediaSrc } from '@/lib/collect-labels'
import type { CollectedPost } from '@/types'

export function ThreadCard({ post }: { post: CollectedPost }) {
  const collected = post.collected_at ? new Date(post.collected_at) : null
  const date = collected ? collected.toISOString().slice(0, 10) : ''
  const shortDate = collected ? `${collected.getMonth() + 1}/${collected.getDate()}` : ''
  const grade = post.grade ? GRADE_LABEL[post.grade] : null
  const thumb = mediaSrc(post.thumbnail_url)
  const caption =
    post.caption && post.caption !== post.author && post.caption !== `@${post.author}`
      ? post.caption
      : '본문 없음'
  const initial = (post.author?.[0] ?? 'U').toUpperCase()

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
        {grade && (
          <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
            {grade}
            {post.multiplier != null ? ` ${Number(post.multiplier).toFixed(1)}배` : ''}
          </span>
        )}
      </div>

      <p className="mb-3 line-clamp-5 text-sm leading-relaxed text-white/80">{caption}</p>

      {thumb && (
        <img src={thumb} alt="" className="mb-3 h-44 w-full rounded-xl object-cover" />
      )}

      <div className="mb-3 grid grid-cols-3 gap-y-2 rounded-xl bg-[#0c0c10] px-3 py-2.5 text-center">
        {[
          ['조회', post.views],
          ['좋아요', post.likes],
          ['답글', post.comments],
          ['리포스트', post.reposts],
          ['공유', post.shares],
          ['인용', post.quotes],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <p className="text-[10px] text-white/35">{label}</p>
            <p className="text-xs font-semibold text-white">{formatCount(value as number)}</p>
          </div>
        ))}
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
