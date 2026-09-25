'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  BarChart3,
  CalendarClock,
  Clock3,
  ExternalLink,
  Inbox,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Upload,
  XCircle,
} from 'lucide-react'
import { BrandMark, type BrandId } from '@/components/brand-logos'
import { GRADE_LABEL, GRADE_PILL, derivePostStats, formatCount } from '@/lib/collect-labels'
import { hydrateScheduledPosts } from '@/lib/post-schedule'
import { platformHome, platformLabel } from '@/lib/platform-permalink'
import { cn } from '@/lib/utils'
import type { CollectedPost, CollectPlatform, CollectStatus, ConnectedAccount, PerformanceGrade } from '@/types'
import { InstagramCard } from '@/app/(dashboard)/instagram/instagram-card'
import { TikTokCard } from '@/app/(dashboard)/tiktok/tiktok-card'

const STATUS_ORDER: CollectStatus[] = [
  'collected',
  'analysis',
  'editing',
  'ready',
  'failed',
  'scheduled',
  'uploaded',
]

type StatusFilter = 'all' | CollectStatus
type SortMode = 'newest' | 'oldest' | 'views' | 'likes'

const STATUS_FILTERS: { id: StatusFilter; label: string; icon: typeof Inbox }[] = [
  { id: 'all', label: '전체', icon: Layers },
  { id: 'collected', label: '수집', icon: Inbox },
  { id: 'analysis', label: '분석', icon: BarChart3 },
  { id: 'editing', label: '편집', icon: Pencil },
  { id: 'ready', label: '발행대기', icon: Clock3 },
  { id: 'failed', label: '발행실패', icon: XCircle },
  { id: 'scheduled', label: '예약', icon: CalendarClock },
  { id: 'uploaded', label: '업로드', icon: Upload },
]

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

export function CollectedBoard({
  platform,
  posts: initialPosts,
  accounts: initialAccounts,
}: {
  platform: Extract<CollectPlatform, 'instagram' | 'tiktok'>
  posts: CollectedPost[]
  accounts: ConnectedAccount[]
}) {
  const searchParams = useSearchParams()
  const brandId = platform as BrandId
  const basePath = `/${platform}`
  const home = platformHome(platform)
  const title = platformLabel(platform)

  const [posts, setPosts] = useState(initialPosts)
  const [accounts] = useState(initialAccounts)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState<'all' | PerformanceGrade>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('collected')
  const [sort, setSort] = useState<SortMode>('newest')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    setPosts(hydrateScheduledPosts(initialPosts))
  }, [initialPosts])

  useEffect(() => {
    const status = searchParams.get('status')
    if (!status) {
      setStatusFilter('collected')
      return
    }
    if (status === 'all' || STATUS_ORDER.includes(status as CollectStatus)) {
      setStatusFilter(status as StatusFilter)
    }
  }, [searchParams])

  useEffect(() => {
    let alive = true
    async function pull() {
      const res = await fetch(`/api/collected/posts?platform=${platform}`, { cache: 'no-store' })
      if (!res.ok || !alive) return
      const data = await res.json()
      if (Array.isArray(data.posts) && alive) {
        setPosts(
          hydrateScheduledPosts(
            data.posts.filter((post: CollectedPost) => !hiddenIds.includes(post.id)),
          ),
        )
      }
    }
    void pull()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void pull()
    }, 2500)
    const onFocus = () => void pull()
    window.addEventListener('focus', onFocus)
    return () => {
      alive = false
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [hiddenIds, platform])

  function selectStatus(next: StatusFilter) {
    setStatusFilter(next)
    const href = next === 'all' ? basePath : `${basePath}?status=${next}`
    window.history.replaceState(null, '', href)
  }

  const counts = useMemo(
    () =>
      Object.fromEntries(
        STATUS_ORDER.map((status) => [status, posts.filter((p) => p.status === status).length]),
      ) as Record<CollectStatus, number>,
    [posts],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const next = posts.filter((post) => {
      if (hiddenIds.includes(post.id)) return false
      if (statusFilter !== 'all' && post.status !== statusFilter) return false
      const stats = derivePostStats(post)
      if (grade !== 'all' && stats.grade !== grade) return false
      if (!q) return true
      return (
        (post.author ?? '').toLowerCase().includes(q) ||
        (post.caption ?? '').toLowerCase().includes(q)
      )
    })
    next.sort((a, b) => {
      if (sort === 'oldest') return new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime()
      if (sort === 'views') return (b.views ?? 0) - (a.views ?? 0)
      if (sort === 'likes') return (b.likes ?? 0) - (a.likes ?? 0)
      return new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime()
    })
    return next
  }, [posts, query, grade, hiddenIds, statusFilter, sort])

  async function refreshPosts() {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/collected/posts?platform=${platform}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.posts)) {
        setPosts(
          hydrateScheduledPosts(
            data.posts.filter((post: CollectedPost) => !hiddenIds.includes(post.id)),
          ),
        )
      }
    } finally {
      setRefreshing(false)
    }
  }

  function onRemoved(id: string) {
    setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setPosts((prev) => prev.filter((post) => post.id !== id))
  }

  function onUpdated(next: CollectedPost) {
    setPosts((prev) => prev.map((post) => (post.id === next.id ? next : post)))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandMark id={brandId} className="h-10 w-10" />
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="text-xs text-white/40">
              Hami로 수집한 {title} 게시물 · 모바일 피드 스타일
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/settings?tab=${platform}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/8 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/12"
          >
            <Plus className="h-3.5 w-3.5" />
            계정 연결
          </Link>
          <a
            href={home}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
          >
            {title} 열기 <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={() => void refreshPosts()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/8 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/12"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            새로고침
          </button>
        </div>
      </div>

      {accounts.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex w-[112px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3"
            >
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-bold text-white">
                {account.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={account.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  (account.username[0] || 'U').toUpperCase()
                )}
              </div>
              <p className="w-full truncate text-center text-[11px] font-semibold text-white">
                @{account.username}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-3 text-xs text-white/40">
          연결된 {title} 계정이 없습니다.{' '}
          <Link href={`/settings?tab=${platform}`} className="text-gold underline">
            설정에서 추가
          </Link>
        </div>
      )}

      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
        {STATUS_FILTERS.map((item) => {
          const Icon = item.icon
          const count = item.id === 'all' ? posts.length : counts[item.id as CollectStatus] || 0
          const active = statusFilter === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectStatus(item.id)}
              className={cn(
                'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition',
                active ? 'mostem-filter-btn' : 'bg-white/5 text-white/55 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
              <span className={cn('rounded-md px-1.5 py-0.5 text-[10px]', active ? 'bg-black/20' : 'bg-white/8')}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="작성자·본문 검색"
          className="h-10 min-w-[180px] flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-white/30"
        />
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value as 'all' | PerformanceGrade)}
          className="h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white"
        >
          <option value="all">전체 등급</option>
          <option value="explosion">폭발</option>
          <option value="strong">강함</option>
          <option value="excellent">우수</option>
          <option value="normal">보통</option>
          <option value="weak">약함</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white"
        >
          <option value="newest">최신순</option>
          <option value="oldest">오래된순</option>
          <option value="views">조회순</option>
          <option value="likes">좋아요순</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <BrandMark id={brandId} className="mx-auto mb-4 h-14 w-14" />
          <p className="text-sm text-white/45">수집된 {title} 게시물이 없습니다.</p>
          <p className="mt-1 text-xs text-white/30">
            Hami 확장으로 {title}에서 수집하면 여기에 표시됩니다.
          </p>
        </div>
      ) : platform === 'instagram' ? (
        <div className="mx-auto grid max-w-xl gap-6 sm:max-w-2xl md:max-w-3xl md:grid-cols-2 xl:max-w-5xl xl:grid-cols-3">
          {filtered.map((post) => (
            <div key={post.id} className="space-y-2">
              <div className="flex justify-end">
                <GradePill post={post} />
              </div>
              <InstagramCard post={post} onRemoved={onRemoved} onUpdated={onUpdated} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((post) => (
            <TikTokCard key={post.id} post={post} onRemoved={onRemoved} onUpdated={onUpdated} />
          ))}
        </div>
      )}

      <p className="pb-2 text-[11px] text-white/25">
        표시 {filtered.length} · 전체 {posts.length} · 조회 합계{' '}
        {formatCount(filtered.reduce((sum, post) => sum + (post.views || 0), 0))}
      </p>
    </div>
  )
}
