'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react'
import {
  formatKeywordTime,
  type KeywordState,
  type KeywordsPayload,
  type RankingNews,
} from '@/lib/keywords'
import { cn } from '@/lib/utils'

const NEWS_PER_PAGE = 12
const NEWS_PAGES = 30
const POLL_MS = 30_000

const STATE_UI: Record<
  KeywordState,
  { label: string; className: string }
> = {
  new: { label: 'NEW', className: 'bg-gold text-black' },
  up: { label: '▲', className: 'bg-red-500/15 text-red-400' },
  down: { label: '▼', className: 'bg-sky-500/15 text-sky-400' },
  same: { label: '—', className: 'bg-white/8 text-white/35' },
}

function naverSearch(keyword: string) {
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`
}

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

export function KeywordsClient({ initial }: { initial: KeywordsPayload }) {
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
  const left = data.keywords.slice(0, 5)
  const right = data.keywords.slice(5, 10)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
            </span>
            <h1 className="text-xl font-bold text-white md:text-2xl">실시간 키워드</h1>
          </div>
          <p className="mt-1 text-sm text-white/45">
            지금 포털에서 많이 검색되는 말 · {formatKeywordTime(data.now)}
          </p>
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

      {data.error && data.keywords.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-sm text-white/40">
          {data.error}
        </div>
      ) : (
        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">실시간 검색어</h2>
            <span className="text-[11px] text-white/35">시그널 기준 1~10위</span>
          </div>
          <div className="grid gap-x-8 md:grid-cols-2">
            <KeywordColumn items={left} />
            <KeywordColumn items={right} />
          </div>
        </section>
      )}

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
        <div className="grid grid-cols-3 gap-3">
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

      <p className="pb-2 text-[11px] text-white/30">
        데이터 출처: 시그널 실시간 검색어 · 네이버 뉴스 랭킹
      </p>
    </div>
  )
}

function KeywordColumn({
  items,
}: {
  items: KeywordsPayload['keywords']
}) {
  return (
    <ol className="divide-y divide-white/5">
      {items.map((item) => {
        const ui = STATE_UI[item.state]
        return (
          <li key={item.rank}>
            <div className="flex items-center gap-3 py-2.5">
              <span
                className={cn(
                  'w-6 shrink-0 text-center text-sm font-bold tabular-nums',
                  item.rank <= 3 ? 'text-gold' : 'text-white/40'
                )}
              >
                {item.rank}
              </span>
              <a
                href={item.summaryUrl || naverSearch(item.keyword)}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm font-medium text-white hover:text-gold"
                title={item.keyword}
              >
                {item.keyword}
              </a>
              <span
                className={cn(
                  'inline-flex min-w-[2.25rem] justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  ui.className
                )}
              >
                {ui.label}
              </span>
              <a
                href={naverSearch(item.keyword)}
                target="_blank"
                rel="noreferrer"
                className="hidden text-white/25 hover:text-white/70 sm:inline-flex"
                aria-label={`${item.keyword} 네이버 검색`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
