'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import {
  GRADE_LABEL,
  GRADE_PILL,
  STATUS_CLASS,
  STATUS_LABEL,
  derivePostStats,
  formatCount,
  mediaSrc,
} from '@/lib/collect-labels'
import { parseMediaItems } from '@/lib/collect-media'
import { ThreadCard } from './thread-card'
import type { CollectedPost, CollectStatus, ConnectedAccount, PerformanceGrade } from '@/types'

const STATUS_ORDER: CollectStatus[] = [
  'collected',
  'analysis',
  'editing',
  'ready',
  'failed',
  'scheduled',
  'uploaded',
]

const KANBAN_COLUMNS: CollectStatus[] = [
  'collected',
  'analysis',
  'editing',
  'ready',
  'failed',
]

const KANBAN_DOT: Record<CollectStatus, string> = {
  collected: 'bg-white/40',
  analysis: 'bg-violet-400',
  editing: 'bg-gold',
  ready: 'bg-sky-400',
  failed: 'bg-red-400',
  scheduled: 'bg-amber-400',
  uploaded: 'bg-brand',
}

type ViewMode = 'grid' | 'list' | 'kanban'

function captionOf(post: CollectedPost) {
  return post.caption && post.caption !== post.author && post.caption !== `@${post.author}`
    ? post.caption
    : '본문 없음'
}

function thumbOf(post: CollectedPost) {
  const items = parseMediaItems(post)
  return mediaSrc(items[0]?.poster ?? items[0]?.url ?? post.thumbnail_url)
}

function GradePill({ post }: { post: CollectedPost }) {
  const stats = derivePostStats(post)
  if (!stats.grade) {
    return <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/40">집계 전</span>
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${GRADE_PILL[stats.grade]}`}>
      {GRADE_LABEL[stats.grade]} {stats.multiplier != null ? `${Number(stats.multiplier).toFixed(1)}배` : ''}
    </span>
  )
}

export function ThreadsBoard({
  posts: initialPosts,
  accounts,
}: {
  posts: CollectedPost[]
  accounts: ConnectedAccount[]
}) {
  const [posts, setPosts] = useState(initialPosts)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [view, setView] = useState<ViewMode>('grid')

  useEffect(() => {
    const saved = window.localStorage.getItem('mostem-threads-view')
    if (saved === 'list' || saved === 'kanban' || saved === 'grid') setView(saved)
  }, [])

  useEffect(() => {
    let alive = true
    async function pull() {
      const res = await fetch('/api/threads/posts', { cache: 'no-store' })
      if (!res.ok || !alive) return
      const data = await res.json()
      if (Array.isArray(data.posts) && alive) {
        setPosts(data.posts.filter((post: CollectedPost) => !hiddenIds.includes(post.id)))
      }
    }
    void pull()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void pull()
    }, 2000)
    const onFocus = () => void pull()
    window.addEventListener('focus', onFocus)
    return () => {
      alive = false
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [hiddenIds])
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState<'all' | PerformanceGrade>('all')

  const counts = useMemo(
    () =>
      Object.fromEntries(
        STATUS_ORDER.map((status) => [status, posts.filter((p) => p.status === status).length])
      ) as Record<CollectStatus, number>,
    [posts]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return posts.filter((post) => {
      if (hiddenIds.includes(post.id)) return false
      const stats = derivePostStats(post)
      if (grade !== 'all' && stats.grade !== grade) return false
      if (!q) return true
      return (
        (post.author ?? '').toLowerCase().includes(q) ||
        (post.caption ?? '').toLowerCase().includes(q)
      )
    })
  }, [posts, query, grade, hiddenIds])

  function setMode(next: ViewMode) {
    setView(next)
    window.localStorage.setItem('mostem-threads-view', next)
  }

  function onRemoved(id: string) {
    setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setPosts((prev) => prev.filter((post) => post.id !== id))
    void fetch(`/api/threads/posts/${id}`, { method: 'DELETE' })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">수집된 스레드</h1>
          <p className="mt-1 text-sm text-white/45">
            Mostem에 로그인한 뒤 하미에서 수집하면 여기에 바로 쌓입니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/compose" className="rounded-xl bg-white/8 px-3 py-2 text-xs font-semibold text-white hover:bg-white/12">
            새 글
          </Link>
          <a
            href="https://www.threads.net/"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white"
          >
            수집하러 가기
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {accounts.length > 0 ? (
          accounts.map((account) => (
            <span key={account.id} className="rounded-full bg-white/8 px-2.5 py-1 text-white/70">
              @{account.username}
            </span>
          ))
        ) : (
          <span className="text-white/35">연결된 스레드 아이디는 선택 사항입니다</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg bg-white/8 px-2.5 py-1 text-white/70">전체 {posts.length}</span>
        {STATUS_ORDER.map((status) => (
          <span key={status} className="rounded-lg bg-white/5 px-2.5 py-1 text-white/45">
            {STATUS_LABEL[status]} {counts[status]}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="본문·작성자 검색"
          className="h-9 min-w-[180px] flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white outline-none"
        />
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value as 'all' | PerformanceGrade)}
          className="h-9 rounded-xl border border-white/10 bg-[#141418] px-2 text-xs text-white"
        >
          <option value="all">전체 등급</option>
          <option value="explosion">폭발</option>
          <option value="strong">강력</option>
          <option value="excellent">우수</option>
          <option value="normal">보통</option>
          <option value="weak">약함</option>
        </select>
        <p className="text-xs text-white/40">총 {filtered.length}개</p>
        <div className="ml-auto flex rounded-xl bg-white/5 p-1">
          {([
            ['grid', '그리드'],
            ['list', '리스트'],
            ['kanban', '칸반'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                view === id ? 'bg-white text-black' : 'text-white/55 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <p className="text-sm text-white/50">아직 수집된 스레드가 없습니다.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((post) => (
            <ThreadCard key={post.id} post={post} onRemoved={onRemoved} />
          ))}
        </div>
      ) : view === 'list' ? (
        <ListView posts={filtered} onRemoved={onRemoved} />
      ) : (
        <KanbanView posts={filtered} onRemoved={onRemoved} />
      )}
    </div>
  )
}

function ListView({
  posts,
  onRemoved,
}: {
  posts: CollectedPost[]
  onRemoved: (id: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-[960px] w-full text-left">
        <thead className="text-[11px] text-white/40">
          <tr className="border-b border-white/10">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">내용</th>
            <th className="px-3 py-2 font-medium">조회</th>
            <th className="px-3 py-2 font-medium">좋아요</th>
            <th className="px-3 py-2 font-medium">답글</th>
            <th className="px-3 py-2 font-medium">상태</th>
            <th className="px-3 py-2 font-medium">성과</th>
            <th className="px-3 py-2 font-medium">수집일</th>
            <th className="px-3 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {posts.map((post, index) => {
            const stats = derivePostStats(post)
            const thumb = thumbOf(post)
            const media = parseMediaItems(post)
            const videos = media.filter((item) => item.type === 'video').length
            const photos = media.filter((item) => item.type !== 'video').length
            const collected = post.collected_at ? new Date(post.collected_at) : null
            return (
              <tr key={post.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-3 py-3 text-xs text-white/35">{posts.length - index}</td>
                <td className="px-3 py-3">
                  <div className="flex min-w-[280px] items-start gap-3">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-lg bg-white/5" />
                    )}
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm text-white">{captionOf(post)}</p>
                      <p className="mt-1 text-[11px] text-white/40">
                        @{post.author || 'unknown'} · 팔로워 {formatCount(stats.followers)}
                      </p>
                      <p className="mt-1 text-[10px] text-white/30">
                        {videos > 0 ? `영상 ${videos}` : ''}
                        {videos > 0 && photos > 0 ? ' · ' : ''}
                        {photos > 0 ? `사진 ${photos}` : ''}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-white">{formatCount(stats.views)}</td>
                <td className="px-3 py-3 text-sm text-white">{formatCount(stats.likes)}</td>
                <td className="px-3 py-3 text-sm text-white">{formatCount(stats.comments)}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[post.status]}`}>
                    {STATUS_LABEL[post.status]}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <GradePill post={post} />
                </td>
                <td className="px-3 py-3 text-xs text-white/45">
                  {collected ? `${collected.getMonth() + 1}/${collected.getDate()}` : '-'}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {post.url && (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg px-2 py-1 text-[11px] text-white/45 hover:bg-white/5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Link
                      href={`/threads/${post.id}/edit?tab=rewrite`}
                      className="rounded-lg bg-brand px-2.5 py-1 text-[11px] font-semibold text-white"
                    >
                      편집
                    </Link>
                    <button
                      type="button"
                      onClick={() => onRemoved(post.id)}
                      className="rounded-lg px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/20"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function KanbanView({
  posts,
  onRemoved,
}: {
  posts: CollectedPost[]
  onRemoved: (id: string) => void
}) {
  return (
    <div className="-mx-1 overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3 px-1">
        {KANBAN_COLUMNS.map((status) => {
          const column = posts.filter((post) => post.status === status)
          return (
            <section key={status} className="w-[280px] shrink-0 rounded-2xl bg-white/[0.03] p-3">
              <div className="mb-3 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${KANBAN_DOT[status]}`} />
                <h2 className="text-sm font-semibold text-white">{STATUS_LABEL[status]}</h2>
                <span className="text-xs text-white/35">{column.length}</span>
              </div>
              <div className="space-y-2">
                {column.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-xs text-white/30">
                    비어 있어요
                  </div>
                ) : (
                  column.map((post) => {
                    const stats = derivePostStats(post)
                    const collected = post.collected_at ? new Date(post.collected_at) : null
                    return (
                      <article key={post.id} className="rounded-xl border border-white/10 bg-[#141418] p-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-white">@{post.author || 'unknown'}</p>
                          <GradePill post={post} />
                        </div>
                        <p className="line-clamp-3 text-sm text-white/80">{captionOf(post)}</p>
                        <p className="mt-3 text-[11px] text-white/40">
                          수집 {collected ? `${collected.getMonth() + 1}/${collected.getDate()}` : '-'} · 조회{' '}
                          {formatCount(stats.views)} · 좋아요 {formatCount(stats.likes)}
                        </p>
                        <div className="mt-2 flex justify-end gap-1.5">
                          <Link
                            href={`/threads/${post.id}/edit?tab=rewrite`}
                            className="rounded-lg bg-brand px-2 py-1 text-[10px] font-semibold text-white"
                          >
                            편집
                          </Link>
                          <button
                            type="button"
                            onClick={() => onRemoved(post.id)}
                            className="rounded-lg px-2 py-1 text-[10px] text-red-300"
                          >
                            삭제
                          </button>
                        </div>
                      </article>
                    )
                  })
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
