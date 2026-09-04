'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, LineChart, Newspaper, Radio, RefreshCw } from 'lucide-react'
import { formatKeywordTime, type KeywordsPayload, type RankingNews } from '@/lib/keywords'
import { PRESS_NAV_GROUPS, type PressOutlet } from '@/lib/press'
import { cn } from '@/lib/utils'

const PRESS_TAB_META = [
  { title: '방송', icon: Radio, caption: '방송사' },
  { title: '종합일간', icon: Newspaper, caption: '일간지' },
  { title: '경제', icon: LineChart, caption: '경제지' },
] as const

const NEWS_PER_PAGE = 12
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

export function NewsClient({ initial }: { initial: KeywordsPayload }) {
  const [data, setData] = useState(initial)
  const [newsPage, setNewsPage] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  async function reload() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/keywords', { cache: 'no-store' })
      if (!res.ok) return
      const next = (await res.json()) as KeywordsPayload
      setData(next)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
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
  const newsSlice = newsForPage(data.news, page)

  return (
    <div className="mx-auto max-w-6xl space-y-4">
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

      <PressHoverBar />

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">언론사별 가장 많이 본 뉴스</h2>
            <p className="mt-0.5 text-xs text-white/40">각 언론사의 가장 많이 본 기사 1건</p>
          </div>
          {data.news.length > 0 && (
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {newsSlice.map((item, index) => (
            <a
              key={`${item.link}-${index}`}
              href={item.link}
              target="_blank"
              rel="noreferrer"
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
      </section>

      <p className="pb-2 text-[11px] text-white/30">데이터 출처: 네이버 뉴스 랭킹</p>
    </div>
  )
}

function PressLogo({ outlet }: { outlet: PressOutlet }) {
  const [src, setSrc] = useState(outlet.logo)
  const fallbackUsed = useRef(false)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-full w-full object-contain"
      onError={() => {
        if (fallbackUsed.current) return
        fallbackUsed.current = true
        try {
          const host = new URL(outlet.url).hostname
          setSrc(`https://www.google.com/s2/favicons?domain=${host}&sz=64`)
        } catch {
          /* keep broken image */
        }
      }}
    />
  )
}

function PressHoverBar() {
  const [openTitle, setOpenTitle] = useState<string | null>(null)
  const openIndex = PRESS_NAV_GROUPS.findIndex((group) => group.title === openTitle)
  const openGroup = openIndex >= 0 ? PRESS_NAV_GROUPS[openIndex] : null

  return (
    <section
      className="mostem-press-bar sticky top-0 z-20 -mx-3 rounded-2xl border border-gold/20 bg-[var(--card-bg)]/95 shadow-[0_0_0_1px_rgba(245,197,24,0.06),0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur md:-mx-0"
      onMouseLeave={() => setOpenTitle(null)}
    >
      <div className="mostem-press-sheen z-0" />
      <div className="relative z-10 grid grid-cols-3">
        {PRESS_NAV_GROUPS.map((group, index) => {
          const meta = PRESS_TAB_META.find((item) => item.title === group.title)
          const Icon = meta?.icon ?? Newspaper
          const active = openTitle === group.title
          return (
            <div
              key={group.title}
              onMouseEnter={() => setOpenTitle(group.title)}
              className={cn(
                'relative flex h-[4.25rem] cursor-default flex-col items-center justify-center gap-1 transition-colors duration-200',
                active ? 'bg-gold/[0.08]' : 'hover:bg-white/[0.03]'
              )}
            >
              <Icon
                className={cn(
                  'h-3.5 w-3.5 transition-colors duration-200',
                  active ? 'text-gold' : 'text-gold/55'
                )}
                strokeWidth={1.75}
              />
              <span
                className={cn(
                  'text-[15px] font-semibold tracking-tight transition-colors duration-200',
                  active ? 'text-gold' : 'text-white'
                )}
              >
                {group.title}
              </span>
              <span className={cn('text-[10px] transition-colors', active ? 'text-gold/70' : 'text-white/35')}>
                {group.outlets.length}개 {meta?.caption}
              </span>
              {index < PRESS_NAV_GROUPS.length - 1 ? (
                <span className="pointer-events-none absolute right-0 top-1/2 h-8 w-px -translate-y-1/2 bg-white/8" />
              ) : null}
            </div>
          )
        })}
        <div
          className={cn(
            'pointer-events-none absolute bottom-0 h-[2px] bg-gold transition-all duration-300 ease-out',
            openIndex >= 0 ? 'mostem-press-indicator w-1/3' : 'w-full bg-gold/35'
          )}
          style={openIndex >= 0 ? { left: `${(openIndex / 3) * 100}%` } : { left: 0 }}
        />
      </div>
      <div
        className={cn(
          'relative z-10 grid transition-all duration-300 ease-out',
          openGroup ? 'grid-rows-[1fr] border-t border-gold/15' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          {openGroup && (
            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-5">
              {openGroup.outlets.map((outlet) => (
                <a
                  key={outlet.url}
                  href={outlet.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-2.5 rounded-xl border border-white/8 bg-black/25 px-2.5 py-2 transition duration-200 hover:-translate-y-0.5 hover:border-gold/40 hover:bg-gold/[0.06]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-0.5">
                    <PressLogo outlet={outlet} />
                  </span>
                  <span className="truncate text-[13px] font-medium text-white/90 group-hover:text-white">
                    {outlet.name}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
