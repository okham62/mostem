'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react'
import { formatKeywordTime, type KeywordsPayload, type RankingNews } from '@/lib/keywords'
import { PRESS_GROUPS, type PressGroup, type PressOutlet } from '@/lib/press'
import { cn } from '@/lib/utils'

const NEWS_PER_PAGE = 12
const NEWS_PAGES = 30
const POLL_MS = 30_000
const PRESS_TABS = ['전체', ...PRESS_GROUPS.map((group) => group.title)] as const
const LEFT_PRESS = PRESS_GROUPS.slice(0, 2)
const RIGHT_PRESS = PRESS_GROUPS.slice(2)

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

function outletsForTab(tab: string): Array<PressOutlet & { group: string }> {
  const groups = tab === '전체' ? PRESS_GROUPS : PRESS_GROUPS.filter((group) => group.title === tab)
  return groups.flatMap((group) => group.outlets.map((outlet) => ({ ...outlet, group: group.title })))
}

export function NewsClient({ initial }: { initial: KeywordsPayload }) {
  const [data, setData] = useState(initial)
  const [newsPage, setNewsPage] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [pressTab, setPressTab] = useState<(typeof PRESS_TABS)[number]>('전체')

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
  const outlets = useMemo(() => outletsForTab(pressTab), [pressTab])

  return (
    <div className="flex gap-3 xl:gap-4">
      <PressRail groups={LEFT_PRESS} />

      <div className="min-w-0 flex-1 space-y-4">
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

        <div className="xl:hidden">
          <PressDock tab={pressTab} onTabChange={setPressTab} outlets={outlets} />
        </div>

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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

      <PressRail groups={RIGHT_PRESS} />
    </div>
  )
}

function PressRail({ groups }: { groups: PressGroup[] }) {
  return (
    <aside className="hidden w-44 shrink-0 xl:block">
      <div className="sticky top-2 max-h-[calc(100vh-5.5rem)] space-y-4 overflow-y-auto scrollbar-thin pr-1">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-1.5 px-1 text-[10px] font-semibold tracking-wider text-white/35">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.outlets.map((outlet) => (
                <a
                  key={outlet.url}
                  href={outlet.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center justify-between gap-2 rounded-lg border border-transparent bg-[var(--card-bg)] px-2.5 py-1.5 text-xs font-medium text-white/80 transition hover:-translate-y-0.5 hover:border-gold/40 hover:text-gold"
                >
                  <span className="truncate">{outlet.name}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-white/20 group-hover:text-gold" />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

function PressDock({
  tab,
  onTabChange,
  outlets,
}: {
  tab: string
  onTabChange: (tab: (typeof PRESS_TABS)[number]) => void
  outlets: Array<PressOutlet & { group: string }>
}) {
  const loop = outlets.length > 0 ? [...outlets, ...outlets] : []

  return (
    <section className="sticky top-0 z-20 -mx-3 border-b border-white/5 bg-[var(--background)]/92 px-3 py-2 backdrop-blur md:-mx-4 md:px-4">
      <div className="mb-2 flex min-w-0 gap-1 overflow-x-auto scrollbar-thin">
        {PRESS_TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onTabChange(item)}
            className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
              tab === item
                ? 'bg-gold text-black'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
            )}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mostem-marquee overflow-hidden">
        <div key={tab} className="mostem-marquee-track gap-2 pr-2">
          {loop.map((outlet, index) => (
            <a
              key={`${outlet.url}-${index}`}
              href={outlet.url}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-white transition hover:-translate-y-0.5 hover:border-gold/50 hover:text-gold"
              title={`${outlet.group} · ${outlet.name}`}
            >
              {tab === '전체' && (
                <span className="text-[10px] text-white/30">{outlet.group}</span>
              )}
              <span>{outlet.name}</span>
              <ExternalLink className="h-3 w-3 text-white/25 group-hover:text-gold" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
