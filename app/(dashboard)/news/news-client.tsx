'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUp,
  ChevronDown,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react'
import type { RankingNews } from '@/lib/keywords'
import {
  NEWS_CATEGORIES,
  formatNewsClock,
  formatNewsClockShort,
  isNewsCategory,
  newsCategory,
  type CategoryNewsPayload,
  type NewsCategoryId,
} from '@/lib/news-categories'
import { PRESS_NAV_OUTLETS } from '@/lib/press'
import { cn } from '@/lib/utils'
import { logWork } from '@/lib/client-log'
import { NewsSkeleton } from './news-skeleton'

const NEWS_BATCH = 20
const POLL_MS = 1_000

function scrollParentOf(el: HTMLElement | null) {
  let node = el?.parentElement ?? null
  while (node) {
    const { overflowY } = window.getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
    node = node.parentElement
  }
  return document.scrollingElement as HTMLElement | null
}

export function NewsClient({ initial }: { initial?: CategoryNewsPayload | null }) {
  const [category, setCategory] = useState<NewsCategoryId>('ranking')
  const [bucket, setBucket] = useState<Partial<Record<NewsCategoryId, CategoryNewsPayload>>>(
    initial ? { [initial.category]: initial } : {}
  )
  const [visible, setVisible] = useState(NEWS_BATCH)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [showTop, setShowTop] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const categoryRef = useRef(category)
  categoryRef.current = category

  const data = bucket[category] ?? null
  const active = newsCategory(category)

  async function reload(id: NewsCategoryId, silent = false) {
    if (!silent) setRefreshing(true)
    try {
      const res = await fetch(`/api/news?category=${id}`, { cache: 'no-store' })
      if (!res.ok) return
      const next = (await res.json()) as CategoryNewsPayload
      setBucket((prev) => ({ ...prev, [id]: keepNewsImages(prev[id], next) }))
    } finally {
      if (!silent) setRefreshing(false)
    }
  }

  useLayoutEffect(() => {
    const next = new URLSearchParams(window.location.search).get('cat')
    if (isNewsCategory(next)) setCategory(next)
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (category === 'ranking') url.searchParams.delete('cat')
    else url.searchParams.set('cat', category)
    window.history.replaceState(null, '', url)
    setVisible(NEWS_BATCH)
    if (!bucket[category]) void reload(category)
  }, [category])

  useEffect(() => {
    void reload(category)
    const tick = () => {
      if (document.visibilityState === 'visible') void reload(categoryRef.current, true)
    }
    const id = window.setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [category])

  const filteredNews = useMemo(() => {
    const news = data?.news ?? []
    const q = query.trim().toLowerCase()
    if (!q) return news
    return news.filter(
      (item: RankingNews) =>
        item.title.toLowerCase().includes(q) || (item.press || '').toLowerCase().includes(q)
    )
  }, [data?.news, query])
  const newsSlice = filteredNews.slice(0, visible)

  useEffect(() => {
    setVisible(NEWS_BATCH)
  }, [query])

  useEffect(() => {
    const scroller = scrollParentOf(rootRef.current)
    if (!scroller) return
    const onScroll = () => setShowTop(scroller.scrollTop > 360)
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [data])

  useEffect(() => {
    const sentinel = sentinelRef.current
    const scroller = scrollParentOf(rootRef.current)
    if (!sentinel || !scroller) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        setVisible((count) => Math.min(filteredNews.length, count + NEWS_BATCH))
      },
      { root: scroller, rootMargin: '400px 0px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [filteredNews.length, data])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    const id = window.setTimeout(() => {
      logWork('news_search', { query: q })
    }, 800)
    return () => window.clearTimeout(id)
  }, [query])

  const clock = data?.now ?? Date.now()
  if (!data && Object.keys(bucket).length === 0) return <NewsSkeleton />

  function jumpTop() {
    scrollParentOf(rootRef.current)?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div ref={rootRef} className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="min-w-0 text-xs text-white/45 md:text-sm">
          <span className="md:hidden">{formatNewsClockShort(clock)}</span>
          <span className="hidden md:inline">{formatNewsClock(clock)}</span>
        </p>
        <button
          type="button"
          onClick={() => void reload(category)}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          새로고침
        </button>
      </div>

      <NewsFilterBar query={query} onQuery={setQuery} />

      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 scrollbar-thin md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        {NEWS_CATEGORIES.map((item) => {
          const current = item.id === category
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              onMouseEnter={() => {
                if (!bucket[item.id]) void reload(item.id, true)
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                current ? 'bg-white text-black' : 'bg-white/8 text-white/65 hover:bg-white/12 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">{active.label}</h2>
            <p className="mt-0.5 text-xs text-white/40">{active.hint} · 1초마다 최신순 갱신</p>
          </div>
          {filteredNews.length > 0 ? (
            <p className="text-xs text-white/40">{filteredNews.length}건</p>
          ) : null}
        </div>
        {newsSlice.length === 0 ? (
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] py-16 text-center text-sm text-white/40">
            {data ? '검색 결과가 없습니다.' : '최신 뉴스를 불러오는 중...'}
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
                  <NewsThumb src={item.image} />
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
        {visible < filteredNews.length ? <div ref={sentinelRef} className="h-10" /> : null}
      </section>

      <p className="pb-2 text-[11px] text-white/30">데이터 출처: {data?.source ?? active.source}</p>

      {showTop ? (
        <button
          type="button"
          onClick={jumpTop}
          aria-label="맨 위로"
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[var(--card-bg)] text-white shadow-lg shadow-black/40 hover:border-gold/50 hover:text-gold md:bottom-6 md:right-6"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  )
}

function newsKey(title: string) {
  return title.replace(/\s+/g, '').replace(/[^\w가-힣]/g, '').slice(0, 22)
}

function keepNewsImages(prev: CategoryNewsPayload | undefined, next: CategoryNewsPayload) {
  if (!prev?.news.length) return next
  const images = new Map<string, string>()
  for (const item of prev.news) {
    if (!item.image) continue
    images.set(item.link, item.image)
    images.set(newsKey(item.title), item.image)
  }
  return {
    ...next,
    news: next.news.map((item) =>
      item.image ? item : { ...item, image: images.get(item.link) || images.get(newsKey(item.title)) || '' }
    ),
  }
}

function NewsThumb({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return <div className="flex h-full items-center justify-center text-xs text-white/30">이미지 없음</div>
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
      onError={() => setFailed(true)}
    />
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
  const [ready, setReady] = useState(false)

  function openMenu() {
    setReady(true)
    setOpen(true)
  }

  function closeMenu() {
    setOpen(false)
  }

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
              setOpen((value) => {
                const next = !value
                if (next) setReady(true)
                return next
              })
            }}
            className={cn(
              'mostem-filter-btn inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors duration-150 hover:bg-gold/20 hover:text-gold'
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            전체 언론사
            <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} />
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
        <div
          className="mostem-menu-shell"
          data-open={open ? 'true' : 'false'}
          data-ready={ready ? 'true' : 'false'}
          aria-hidden={!open}
        >
          <div className="mostem-menu-clip">
            {ready ? (
              <div className="mostem-menu-panel border-t border-white/8 p-3">
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {PRESS_NAV_OUTLETS.map((outlet) => (
                    <a
                      key={outlet.url}
                      href={outlet.url}
                      target="_blank"
                      rel="noreferrer"
                      tabIndex={open ? 0 : -1}
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
        </div>
      </div>
    </section>
  )
}

