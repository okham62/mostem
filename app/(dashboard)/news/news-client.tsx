'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react'
import { formatKeywordTime, type KeywordsPayload, type RankingNews } from '@/lib/keywords'
import { fetchRealtime, peekRealtimeCache } from '@/lib/realtime-cache'
import { PRESS_NAV_OUTLETS } from '@/lib/press'
import { cn } from '@/lib/utils'
import { logWork } from '@/lib/client-log'
import { NewsSkeleton } from './news-skeleton'

const NEWS_PER_PAGE = 20
const NEWS_PAGES = 30
const POLL_MS = 30_000

function newsForPage(news: RankingNews[], page: number) {
  if (news.length === 0) return []
  if (news.length <= NEWS_PER_PAGE) {
    return Array.from({ length: NEWS_PER_PAGE }, (_, i) => news[i % news.length])
  }
  const maxStart = news.length - NEWS_PER_PAGE
  const start =
    NEWS_PAGES <= 1 ? 0 : Math.round((page * maxStart) / (NEWS_PAGES - 1))
  return news.slice(start, start + NEWS_PER_PAGE)
}

export function NewsClient({ initial }: { initial?: KeywordsPayload | null }) {
  const [data, setData] = useState<KeywordsPayload | null>(initial ?? null)
  const [newsPage, setNewsPage] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')

  async function reload() {
    setRefreshing(true)
    try {
      const next = await fetchRealtime('news')
      setData(next)
    } finally {
      setRefreshing(false)
    }
  }

  useLayoutEffect(() => {
    const cached = peekRealtimeCache()
    if (cached) setData(cached)
  }, [])

  useEffect(() => {
    void reload()
    const tick = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    const id = window.setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  const page = ((newsPage % NEWS_PAGES) + NEWS_PAGES) % NEWS_PAGES
  const searching = query.trim().length > 0
  const filteredNews = useMemo(() => {
    const news = data?.news ?? []
    const q = query.trim().toLowerCase()
    if (!q) return news
    return news.filter(
      item => item.title.toLowerCase().includes(q) || (item.press || '').toLowerCase().includes(q)
    )
  }, [data?.news, query])
  const newsSlice = searching
    ? filteredNews.slice(0, NEWS_PER_PAGE)
    : newsForPage(data?.news ?? [], page)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    const id = window.setTimeout(() => {
      logWork('news_search', { query: q })
    }, 800)
    return () => window.clearTimeout(id)
  }, [query])

  if (!data) return <NewsSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white md:text-2xl">실시간 뉴스</h1>
          <p className="mt-1 text-sm text-white/45">{formatKeywordTime(data.now)}</p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          새로고침
        </button>
      </div>

      <NewsFilterBar query={query} onQuery={setQuery} />

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">언론사별 가장 많이 본 뉴스</h2>
            <p className="mt-0.5 text-xs text-white/40">각 언론사의 가장 많이 본 기사 1건</p>
          </div>
          {data.news.length > 0 && !searching && (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <button
                type="button"
                onClick={() => setNewsPage((p) => (p - 1 + NEWS_PAGES) % NEWS_PAGES)}
                className="rounded-md p-1 hover:bg-white/10 hover:text-white"
                aria-label="이전 뉴스"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>
                {page + 1} / {NEWS_PAGES}
              </span>
              <button
                type="button"
                onClick={() => setNewsPage((p) => (p + 1) % NEWS_PAGES)}
                className="rounded-md p-1 hover:bg-white/10 hover:text-white"
                aria-label="다음 뉴스"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        {newsSlice.length === 0 ? (
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] py-16 text-center text-sm text-white/40">
            검색 결과가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {newsSlice.map((item, index) => (
              <a
                key={`${item.link}-${index}`}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                onClick={() => logWork('news_open', { title: item.title, press: item.press, url: item.link })}
                className="group overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] transition hover:border-white/20"
              >
                <div className="relative aspect-[16/9] bg-black/40">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-white/30">
                      이미지 없음
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-3.5">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-white/45">
                    {item.pressImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.pressImage} alt="" className="h-4 w-4 rounded-sm object-contain" />
                    ) : null}
                    <span>{item.press || '뉴스'}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <p className="pb-2 text-[11px] text-white/30">데이터 출처: 네이버 뉴스 랭킹</p>
    </div>
  )
}

function NewsFilterBar({
  query,
  onQuery,
}: {
  query: string
  onQuery: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<number | null>(null)

  function openMenu() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setOpen(true)
  }

  function closeMenu() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(false), 180)
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <section className="sticky top-0 z-20 -mx-3 md:-mx-0">
      <div
        className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]"
        onMouseLeave={closeMenu}
      >
        <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
          <button
            type="button"
            aria-expanded={open}
            onMouseEnter={openMenu}
            onClick={() => {
              if (window.matchMedia('(hover: hover)').matches) return
              setOpen((value) => !value)
            }}
            className={cn(
              'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors duration-150',
              open ? 'bg-gold/15 text-gold' : 'text-white/70 hover:bg-white/5 hover:text-white'
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            전체 언론사
            <ChevronDown className={cn('h-4 w-4 transition-transform duration-150', open && 'rotate-180')} />
          </button>
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="뉴스 제목 또는 내용 검색..."
              className="h-10 w-full rounded-lg bg-black/35 pl-9 pr-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-gold/40"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              onQuery('')
              setOpen(false)
            }}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            초기화
          </button>
        </div>
        {open ? (
          <div className="mostem-menu-panel border-t border-white/8 p-3">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {PRESS_NAV_OUTLETS.map((outlet) => (
                <a
                  key={outlet.url}
                  href={outlet.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mostem-menu-item flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] text-white/70 hover:bg-brand/25 hover:text-white hover:shadow-[inset_0_0_0_1px_rgba(245,197,24,0.35)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={outlet.logo}
                    alt=""
                    width={200}
                    height={200}
                    className="h-7 w-7 rounded-md object-cover"
                    onError={(event) => {
                      const host = new URL(outlet.url).hostname
                      event.currentTarget.src = `https://www.google.com/s2/favicons?domain=${host}&sz=128`
                    }}
                  />
                  <span className="truncate font-medium">{outlet.name}</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

