'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { formatKeywordTime, type KeywordsPayload, type RankingNews } from '@/lib/keywords'
import { PRESS_NAV_OUTLETS } from '@/lib/press'
import { cn } from '@/lib/utils'

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

      <PressOutletBar />

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

function PressOutletBar() {
  return (
    <section className="sticky top-0 z-20 -mx-3 border-b border-[var(--card-border)] bg-[var(--background)]/92 py-3 backdrop-blur-md md:-mx-0">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {PRESS_NAV_OUTLETS.map((outlet) => (
          <a
            key={outlet.url}
            href={outlet.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-[13px] text-white/60 transition-colors duration-200 hover:text-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={outlet.logo}
              alt=""
              width={200}
              height={200}
              className="h-8 w-8 rounded-md object-cover"
            />
            <span className="font-medium">{outlet.name}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
