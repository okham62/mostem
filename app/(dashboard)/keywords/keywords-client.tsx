'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import {
  applyBrowserNaver,
  fetchBrowserNaver,
  formatKeywordTime,
  formatKeywordTimeShort,
  formatSearchTraffic,
  KEYWORD_LIMIT,
  type KeywordSource,
  type KeywordState,
  type KeywordsPayload,
  type RealtimeKeyword,
} from '@/lib/keywords'
import { fetchRealtime, peekRealtimeCache, writeRealtimeCache } from '@/lib/realtime-cache'
import { cn } from '@/lib/utils'
import { logWork } from '@/lib/client-log'
import { KeywordsSkeleton } from './keywords-skeleton'

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

export function KeywordsClient({ initial }: { initial?: KeywordsPayload | null }) {
  const [data, setData] = useState<KeywordsPayload | null>(initial ?? null)
  const [refreshing, setRefreshing] = useState(false)

  const sources = data ? defaultSources(data) : []
  const naver = sources.find(s => s.id === 'signal')
  const google = sources.find(s => s.id === 'google')

  async function pullNaver() {
    const local = await fetchBrowserNaver()
    if (!local) return
    setData((prev) => {
      const merged = applyBrowserNaver(prev ?? peekRealtimeCache(), local)
      writeRealtimeCache(merged)
      return merged
    })
  }

  async function reload(scope: 'fast' | 'full' = 'full') {
    setRefreshing(true)
    try {
      const [next, local] = await Promise.all([fetchRealtime(scope).catch(() => peekRealtimeCache()), fetchBrowserNaver()])
      const merged = local ? applyBrowserNaver(next, local) : next
      if (merged) {
        writeRealtimeCache(merged)
        setData(merged)
      }
    } finally {
      setRefreshing(false)
    }
  }

  useLayoutEffect(() => {
    const cached = peekRealtimeCache()
    if (cached) setData(cached)
  }, [])

  useEffect(() => {
    void pullNaver()
    const boot = async () => {
      if (peekRealtimeCache()) {
        void reload('full')
        return
      }
      await reload('fast')
    }
    void boot()
    const tick = () => {
      if (document.visibilityState === 'visible') void reload('full')
    }
    const id = window.setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  if (!data) return <KeywordsSkeleton />

  return (
    <div className="mx-auto max-w-6xl space-y-4 md:space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
            </span>
            <p className="min-w-0 text-xs leading-snug text-white/45 md:text-sm">
              <span className="md:hidden">급상승 검색어 · {formatKeywordTimeShort(data.now)}</span>
              <span className="hidden md:inline">
                네이버와 구글 급상승 검색어를 따로 보여 줍니다 · {formatKeywordTime(data.now)}
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void reload('full')}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10"
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

function SourceMark({ id }: { id?: KeywordSource['id'] }) {
  if (id === 'google') {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" aria-hidden>
        <path fill="#4285F4" d="M23.5 12.3c0-.85-.08-1.67-.22-2.46H12v4.66h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.82z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.27 14.29A7.21 7.21 0 0 1 4.9 12c0-.8.14-1.57.37-2.29V6.62H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.09z" />
        <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.14 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 rounded-[6px]" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#03C75A" />
      <path fill="#fff" d="M13.4 6.2v6.1L9.6 6.2H6.4v11.6h3.2v-6.1l3.9 6.1h3.1V6.2z" />
    </svg>
  )
}

function KeywordPanel({
  source,
  empty,
}: {
  source?: KeywordSource
  empty: string
}) {
  const keywords = (source?.keywords ?? []).slice(0, KEYWORD_LIMIT)
  const hint = source?.id === 'google' ? '한국 급상승 검색어' : '실시간 검색어'
  return (
    <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2.5">
          <SourceMark id={source?.id} />
          <span className="text-lg font-extrabold tracking-tight text-white md:text-xl">
            {source?.label ?? '검색어'}
          </span>
        </h2>
        <span className="shrink-0 rounded-full bg-white/6 px-2 py-1 text-[10px] font-medium text-white/50 md:px-2.5 md:text-[11px]">
          {hint} · 1~10위
        </span>
      </div>
      {keywords.length === 0 ? (
        <div className="py-10 text-center text-sm text-white/40">{source?.error || empty}</div>
      ) : (
        <KeywordColumn items={keywords} source={source?.label || ''} />
      )}
    </section>
  )
}

function KeywordColumn({
  items,
  source,
}: {
  items: RealtimeKeyword[]
  source: string
}) {
  return (
    <ol className="divide-y divide-white/5">
      {items.map((item) => {
        const ui = STATE_UI[item.state]
        const traffic = formatSearchTraffic(item.traffic)
        return (
          <li key={`${item.rank}-${item.keyword}`}>
            <div className="flex min-h-11 items-center gap-3 py-2.5">
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
                onClick={() =>
                  logWork('keyword_open', {
                    keyword: item.keyword,
                    rank: item.rank,
                    source,
                    url: item.searchUrl || naverSearch(item.keyword),
                  })
                }
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
