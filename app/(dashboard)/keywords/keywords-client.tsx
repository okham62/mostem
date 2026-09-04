'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import {
  formatKeywordTime,
  formatSearchTraffic,
  type KeywordSource,
  type KeywordState,
  type KeywordsPayload,
  type RealtimeKeyword,
} from '@/lib/keywords'
import { cn } from '@/lib/utils'

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

function defaultSources(data: KeywordsPayload): KeywordSource[] {
  if (data.sources?.length) return data.sources
  return [
    {
      id: 'signal',
      label: '네이버',
      hint: '실시간 검색어',
      now: data.now,
      keywords: data.keywords,
      error: data.error,
    },
  ]
}

export function KeywordsClient({ initial }: { initial: KeywordsPayload }) {
  const [data, setData] = useState(initial)
  const [refreshing, setRefreshing] = useState(false)

  const sources = defaultSources(data)
  const naver = sources.find((s) => s.id === 'signal')
  const google = sources.find((s) => s.id === 'google')

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
            네이버와 구글 급상승 검색어를 따로 보여 줍니다 · {formatKeywordTime(data.now)}
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

      <div className="grid gap-4 md:grid-cols-2">
        <KeywordPanel source={naver} empty="네이버 순위를 불러오지 못했습니다." />
        <KeywordPanel source={google} empty="구글 트렌드를 불러오지 못했습니다." />
      </div>

      <p className="pb-2 text-[11px] text-white/30">
        데이터 출처: 네이버 검색어 · 구글 트렌드
      </p>
    </div>
  )
}

function KeywordPanel({
  source,
  empty,
}: {
  source?: KeywordSource
  empty: string
}) {
  const keywords = source?.keywords ?? []
  return (
    <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 md:p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="text-lg font-bold text-white">{source?.label ?? '검색어'}</h2>
        <span className="text-[11px] text-white/35">
          {source?.hint} · 1~{Math.max(keywords.length, 1)}위
        </span>
      </div>
      {source?.error && keywords.length === 0 ? (
        <div className="py-10 text-center text-sm text-white/40">{source.error || empty}</div>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin pr-1">
          <KeywordColumn items={keywords} />
        </div>
      )}
    </section>
  )
}

function KeywordColumn({
  items,
}: {
  items: RealtimeKeyword[]
}) {
  return (
    <ol className="divide-y divide-white/5">
      {items.map((item) => {
        const ui = STATE_UI[item.state]
        const traffic = formatSearchTraffic(item.traffic)
        return (
          <li key={`${item.rank}-${item.keyword}`}>
            <div className="flex items-center gap-3 py-2.5">
              <span
                className={cn(
                  'w-7 shrink-0 text-center text-sm font-bold tabular-nums',
                  item.rank <= 3 ? 'text-gold' : 'text-white/40'
                )}
              >
                {item.rank}
              </span>
              <a
                href={item.searchUrl || naverSearch(item.keyword)}
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
                  traffic ? 'bg-gold/15 text-gold' : ui.className
                )}
              >
                {traffic || ui.label}
              </span>
              <a
                href={item.searchUrl || naverSearch(item.keyword)}
                target="_blank"
                rel="noreferrer"
                className="hidden text-white/25 hover:text-white/70 sm:inline-flex"
                aria-label={`${item.keyword} 검색`}
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
