'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Calendar,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Flame,
  RefreshCw,
  Search,
  ShoppingBag,
  Sprout,
  Target,
  Users,
  WandSparkles,
  X,
} from 'lucide-react'
import {
  formatGrowth,
  formatSearchVolume,
  formatTrendDate,
  type CompareWeeks,
  type TrendDetail,
  type TrendKeyword,
  type TrendsPayload,
  type TrendTab,
} from '@/lib/trends'
import { cn } from '@/lib/utils'
import { logWork } from '@/lib/client-log'

const POLL_MS = 5 * 60_000

function itemsForTab(items: TrendKeyword[], tab: TrendTab) {
  if (tab === 'popular') {
    return [...items].sort((a, b) => b.searchTotal - a.searchTotal || b.growth - a.growth)
  }
  if (tab === 'new') {
    const fresh = items.filter((item) => item.isNew)
    const rising = items.filter((item) => item.multiplier >= 3 || item.growth >= 80)
    const rows = fresh.length ? fresh : rising.length ? rising : items
    return [...rows].sort((a, b) => b.growth - a.growth || b.multiplier - a.multiplier || b.searchTotal - a.searchTotal)
  }
  return items
}

const TABS: { id: TrendTab; label: string; hint: string }[] = [
  { id: 'rising', label: '지금 뜨는 키워드', hint: '최근 검색이 빠르게 오른 키워드예요.' },
  { id: 'popular', label: '많이 찾는 키워드', hint: '늘 꾸준히 많이 찾는 큰 주제예요. 안정적으로 반응이 나와요.' },
  { id: 'new', label: '새로 뜬 키워드', hint: '이번에 처음 오른 키워드예요. 남들보다 먼저 쓸 수 있어요.' },
]

const CONTENTS = [
  { id: 'all', label: '모든 콘텐츠' },
  { id: 'purchase', label: '구매/상품 글' },
  { id: 'info', label: '정보/이슈 글' },
] as const

const TIMINGS = [
  { id: 'all', label: '모든 타이밍' },
  { id: 'now', label: '지금 올리기 좋은' },
  { id: 'steady', label: '상승 꾸준한' },
] as const

const COMPARES: { id: CompareWeeks; label: string }[] = [
  { id: 1, label: '1주 전과 비교' },
  { id: 2, label: '2주 전과 비교' },
  { id: 4, label: '4주 전과 비교' },
]

export function TrendsClient({ initial }: { initial: TrendsPayload }) {
  const [data, setData] = useState(initial)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<TrendTab>('rising')
  const [category, setCategory] = useState('all')
  const [content, setContent] = useState<(typeof CONTENTS)[number]['id']>('all')
  const [timing, setTiming] = useState<(typeof TIMINGS)[number]['id']>('all')
  const [compare, setCompare] = useState<CompareWeeks>(1)
  const [excludeBrand, setExcludeBrand] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<TrendKeyword | null>(null)

  async function reload(next?: {
    compare?: CompareWeeks
    cat?: string
    q?: string
    timing?: (typeof TIMINGS)[number]['id']
    tab?: TrendTab
  }) {
    setRefreshing(true)
    const nextCompare = next?.compare ?? compare
    const nextCat = next?.cat ?? category
    const nextQ = next?.q ?? query
    const nextTiming = next?.timing ?? timing
    try {
      const params = new URLSearchParams()
      params.set('compare', String(nextCompare))
      if (nextCat !== 'all') params.set('cat', nextCat)
      if (nextQ.trim()) params.set('q', nextQ.trim())
      if (nextTiming === 'now') params.set('timing', 'now')
      const res = await fetch(`/api/trends?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) return
      const nextData = (await res.json()) as TrendsPayload
      if (nextData?.items?.length) setData(nextData)
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
  }, [compare])

  const filtered = useMemo(() => {
    let rows = itemsForTab(data.items, tab)
    if (category !== 'all') {
      const label = data.categories.find((item) => item.id === category)?.label
      if (label) rows = rows.filter((item) => item.categoryPath.startsWith(label) || item.category === label)
    }
    if (content === 'purchase') rows = rows.filter((item) => item.contentType === 'purchase')
    if (content === 'info') rows = rows.filter((item) => item.contentType === 'info')
    if (timing === 'now') rows = rows.filter((item) => item.peakNow)
    if (timing === 'steady') rows = rows.filter((item) => !item.isNew && item.growth >= 0 && item.growth < 80)
    if (excludeBrand) rows = rows.filter((item) => !item.isBrand)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      rows = rows.filter((item) => item.keyword.toLowerCase().includes(q))
    }
    return rows
  }, [data.items, data.categories, tab, category, content, timing, excludeBrand, query])

  const tabMeta = TABS.find((item) => item.id === tab)!

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">오늘 뭐 쓸까?</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
            네이버 쇼핑에서 지금 많이 찾는 검색어를 모아, 쇼츠·스레드·릴스 소재를 고를 때 바로 쓰게 보여 줍니다.
          </p>
        </div>
        <div className="text-right">
          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            새로고침
          </button>
          <p className="mt-2 text-[11px] text-white/35">
            키워드 {data.stats.total}개 · 급상승 {data.stats.rising}개 · 신규 {data.stats.fresh}개
          </p>
          <p className="mt-2 text-[11px] text-white/30">
            데이터 기준 {data.latestDate || formatTrendDate(data.now)} · 5분마다 자동 확인
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 md:p-5">
        <div className="inline-flex max-w-full flex-wrap rounded-full bg-black/35 p-1 ring-1 ring-white/10">
          {TABS.map((item) => {
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition',
                  active ? 'bg-brand text-white shadow-[0_0_0_1px_rgba(139,92,246,0.35)]' : 'text-white/55 hover:text-white'
                )}
              >
                {item.id === 'rising' ? <Flame className="h-3.5 w-3.5" /> : null}
                {item.id === 'popular' ? <Users className="h-3.5 w-3.5" /> : null}
                {item.id === 'new' ? <Sprout className="h-3.5 w-3.5" /> : null}
                {item.label}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-white/35">{tabMeta.hint}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <HoverSelect
            value={data.categories.find((item) => item.id === category)?.label || '전체 분야'}
            options={data.categories.map((item) => ({ id: item.id, label: item.label }))}
            onChange={(id) => setCategory(id)}
          />
          <HoverSelect
            value={CONTENTS.find((item) => item.id === content)?.label || '모든 콘텐츠'}
            options={CONTENTS.map((item) => ({ id: item.id, label: item.label }))}
            onChange={(id) => setContent(id as typeof content)}
          />
          <HoverSelect
            value={TIMINGS.find((item) => item.id === timing)?.label || '모든 타이밍'}
            options={TIMINGS.map((item) => ({ id: item.id, label: item.label }))}
            onChange={(id) => setTiming(id as typeof timing)}
          />
          <HoverSelect
            value={COMPARES.find((item) => item.id === compare)?.label || '1주 전과 비교'}
            options={COMPARES.map((item) => ({ id: String(item.id), label: item.label }))}
            onChange={(id) => setCompare(Number(id) as CompareWeeks)}
          />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs text-white/55">
            <input
              type="checkbox"
              checked={excludeBrand}
              onChange={(event) => setExcludeBrand(event.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--gold)]"
            />
            브랜드 제외
          </label>
          <label className="relative ml-auto min-w-[180px] flex-1 md:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
            <input
              value={query}
              onChange={(event) => {
                const value = event.target.value
                setQuery(value)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  if (query.trim()) logWork('keyword_search', { query: query.trim() })
                  void reload({ q: query })
                }
              }}
              placeholder="키워드 검색"
              className="h-9 w-full rounded-lg bg-black/30 pl-8 pr-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/30"
            />
          </label>
        </div>

        <div className="mt-2 divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-white/35">
              {refreshing && !data.items.length ? '키워드를 불러오는 중' : '조건에 맞는 키워드가 없습니다.'}
            </div>
          ) : (
            filtered.map((item, index) => (
              <button
                key={`${item.cid}-${item.keyword}`}
                type="button"
                onClick={() => {
                  logWork('trend_open', {
                    keyword: item.keyword,
                    category: item.category,
                    searchTotal: item.searchTotal,
                  })
                  setSelected(item)
                }}
                className="flex w-full items-center gap-4 py-3.5 text-left hover:bg-white/[0.03]"
              >
                <span className="w-8 shrink-0 text-xl font-bold text-brand-400">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-white">{item.keyword}</p>
                  <p className="mt-0.5 truncate text-[11px] text-white/35">{item.categoryPath}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {tab === 'popular' ? null : (
                      <span className="inline-flex items-center gap-1 text-[13px] font-bold text-gold">
                        <Flame className="h-3.5 w-3.5" />
                        {formatGrowth(item.multiplier)}
                      </span>
                    )}
                    {item.peakNow ? (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                        성수기 지금! ({item.peakMonth}월)
                      </span>
                    ) : null}
                    {item.isNew ? (
                      <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] text-orange-200">
                        이번 달 신규
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="min-w-[4.75rem] text-right">
                    <p className="text-sm font-semibold text-white/90">{formatSearchVolume(item.searchTotal)}</p>
                    <p className="text-[10px] text-white/35">한 달 검색</p>
                  </div>
                  <Sparkline
                    points={item.spark}
                    up={
                      item.spark.length >= 2
                        ? item.spark[item.spark.length - 1] >= item.spark[0]
                        : item.growth >= 0
                    }
                  />
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      {selected ? (
        <KeywordModal
          item={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  )
}

function HoverSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: { id: string; label: string }[]
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState<{ top: number; height: number } | null>(null)
  const closeTimer = useRef<number | null>(null)

  function openMenu() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setOpen(true)
  }

  function closeMenu() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => {
      setOpen(false)
      setHighlight(null)
    }, 180)
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    }
  }, [])

  return (
    <div className={cn('relative', open ? 'z-50' : 'z-20')} onMouseEnter={openMenu} onMouseLeave={closeMenu}>
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-black/30 px-3 text-xs text-white/70 ring-1 ring-white/10"
      >
        {value}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180 text-gold')} />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 min-w-[200px] pt-2">
          <div className="mostem-menu-panel relative overflow-hidden rounded-xl border border-white/10 bg-[#16161b] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
            {highlight ? (
              <div
                className="mostem-menu-highlight"
                style={{ top: highlight.top, height: highlight.height }}
              />
            ) : null}
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onMouseEnter={(event) => {
                  const el = event.currentTarget
                  setHighlight({ top: el.offsetTop, height: el.offsetHeight })
                }}
                onClick={() => {
                  onChange(option.id)
                  setOpen(false)
                }}
                className={cn(
                  'mostem-menu-item relative z-[1] flex w-full items-center justify-between px-3 py-2.5 text-left text-xs',
                  option.label === value ? 'text-gold' : 'text-white/70'
                )}
              >
                {option.label}
                {option.label === value ? <Check className="h-3.5 w-3.5 text-gold" /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  const w = 88
  const h = 28
  if (points.length < 2) {
    return <div className="h-7 w-[88px] shrink-0 rounded bg-white/5" />
  }
  const max = Math.max(...points)
  const min = Math.min(...points)
  const d = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * w
      const y = h - ((point - min) / (max - min || 1)) * (h - 2) - 1
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg width={w} height={h} className="shrink-0" viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={d}
        fill="none"
        stroke={up ? '#f87171' : '#60a5fa'}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function KeywordModal({
  item,
  onClose,
}: {
  item: TrendKeyword
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [detail, setDetail] = useState<TrendDetail | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    setReady(false)
    fetch(`/api/trends/detail?keyword=${encodeURIComponent(item.keyword)}&cid=${encodeURIComponent(item.cid)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((next: TrendDetail | null) => {
        if (alive) setDetail(next)
      })
      .catch(() => {
        if (alive) setDetail(null)
      })
      .finally(() => {
        if (alive) setReady(true)
      })
    return () => {
      alive = false
    }
  }, [item.keyword, item.cid])

  const monthly = detail?.monthly ?? []
  const daily = detail?.daily?.length ? detail.daily : item.daily
  const peakMonth = detail?.peakMonth || item.peakMonth
  const searchTotal = detail?.searchTotal || item.searchTotal
  const productCount = detail?.productCount || item.productCount
  const clickRate = detail?.clickRate || item.clickRate
  const adPrice = detail?.adPrice || item.adPrice
  const advice =
    detail?.advice ||
    (item.peakNow
      ? `성수기가 바로 지금 ${item.peakMonth}월이에요. 지금 올리면 딱 좋아요.`
      : `검색이 가장 몰리는 달은 ${item.peakMonth}월입니다. 미리 올려 두면 좋아요.`)
  const oceanHint =
    detail?.oceanHint ||
    (productCount > 0 && productCount <= 30
      ? '아직 경쟁이 적어요. 지금 선점하기 좋아요.'
      : daily.length >= 2 && (daily.at(-1)?.value ?? 0) >= (daily[0]?.value ?? 0)
        ? '관심이 빠르게 커지고 있어요. 지금 선점하기 좋아요.'
        : '아직 경쟁이 적어요. 지금 선점하기 좋아요.')

  async function copyKeyword() {
    await navigator.clipboard.writeText(item.keyword)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div
      className="mostem-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[10px]"
      onClick={onClose}
    >
      <div
        className="mostem-sheet max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#121218] p-5 shadow-2xl scrollbar-thin"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <WandSparkles className="h-4 w-4 text-brand-400" />
              <h2 className="text-xl font-bold text-white">{item.keyword}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold text-black">
                <Flame className="h-3 w-3" />
                30일 {formatGrowth(item.multiplier)}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-[#1b1530] p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-300">
            <Calendar className="h-3.5 w-3.5" />
            언제 올리면 좋을까요?
          </p>
          <p className="mt-2 text-sm font-semibold text-white">{advice}</p>
        </div>

        <ChartBlock title="1년 중 언제 많이 찾나요 (월별 검색량)">
          <BarChart data={monthly} peakMonth={peakMonth} ready={ready} />
        </ChartBlock>
        <ChartBlock title="최근 30일 검색 추이">
          <LineChart data={daily} />
        </ChartBlock>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <InfoCard
            icon={<ShoppingBag className="h-4 w-4 text-brand-300" />}
            title="구매글"
            text={detail?.contentHint || (item.contentType === 'info' ? '정보·이슈 글에 잘 맞아요.' : '상품 추천·리뷰 글에 잘 맞아요.')}
          />
          <InfoCard icon={<Target className="h-4 w-4 text-white/50" />} title="블루오션" text={oceanHint} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatCard label="한 달 검색량" value={searchTotal ? `${formatSearchVolume(searchTotal)}회` : ready ? '0회' : '불러오는 중'} />
          <StatCard
            label="경쟁 상품 수"
            value={productCount > 0 ? `${productCount.toLocaleString('ko-KR')}개` : '-'}
          />
          <StatCard label="클릭률(모바일)" value={clickRate ? `${clickRate.toFixed(2)}%` : '-'} />
          <StatCard label="광고 단가" value={adPrice > 0 ? `${adPrice.toLocaleString('ko-KR')}원` : '-'} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          <a
            href={`https://www.threads.com/search?q=${encodeURIComponent(item.keyword)}`}
            target="_blank"
            rel="noreferrer"
            className="mostem-threads-btn inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white"
          >
            스레드에서 반응 보기
          </a>
          <a
            href={`https://search.naver.com/search.naver?query=${encodeURIComponent(item.keyword)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-2 text-sm font-semibold text-white/80"
          >
            네이버 검색
          </a>
          <a
            href={`https://search.shopping.naver.com/search/all?query=${encodeURIComponent(item.keyword)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-2 text-sm font-semibold text-white/80"
          >
            쇼핑 검색
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            type="button"
            onClick={() => void copyKeyword()}
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-white/50 hover:text-white"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? '복사됨' : '키워드 복사'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ChartBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-semibold text-white">{title}</p>
      <div className="h-44 rounded-xl bg-[#0d0d12] px-3 py-3">{children}</div>
    </div>
  )
}

function BarChart({
  data,
  peakMonth,
  ready,
}: {
  data: { month: number; value: number }[]
  peakMonth: number
  ready: boolean
}) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const map = new Map(data.map((row) => [row.month, row.value]))
  const max = Math.max(1, ...data.map((row) => row.value))
  const hasValue = data.some((row) => row.value > 0)
  if (!ready && !hasValue) {
    return <div className="flex h-full items-center justify-center text-xs text-white/30">월별 검색량을 불러오는 중</div>
  }
  if (ready && !hasValue) {
    return <div className="flex h-full items-center justify-center text-xs text-white/30">월별 검색량이 없습니다</div>
  }
  return (
    <div className="relative h-full">
      <div className="pointer-events-none absolute inset-x-0 bottom-6 top-1 flex flex-col justify-between">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="border-t border-dashed border-white/10" />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-6 top-1 flex items-end gap-2 px-1">
        {months.map((month) => {
          const value = map.get(month) ?? 0
          const peak = month === peakMonth
          return (
            <div
              key={month}
              className="flex h-full flex-1 flex-col items-center justify-end"
              title={`${month}월 ${value.toLocaleString('ko-KR')}회`}
            >
              <div
                className={cn(
                  'w-full rounded-t-[8px] transition-[filter] duration-150 hover:brightness-125',
                  peak ? 'bg-[#FFD240]' : 'bg-[#5E4B8B]'
                )}
                style={{
                  height: `${value <= 0 ? 0 : Math.max(8, (value / max) * 100)}%`,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex px-1">
        {months.map((month) => (
          <span key={month} className="flex-1 text-center text-[10px] text-[#6B7280]">
            {month}월
          </span>
        ))}
      </div>
    </div>
  )
}

function formatKoMd(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return date
  return `${Number(match[2])}월 ${Number(match[3])}일`
}

function monotonePath(points: { x: number; y: number }[]) {
  if (points.length < 2) return ''
  const n = points.length
  const dx: number[] = []
  const dy: number[] = []
  const m: number[] = []
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = points[i + 1].x - points[i].x
    dy[i] = points[i + 1].y - points[i].y
    m[i] = dx[i] === 0 ? 0 : dy[i] / dx[i]
  }
  const t = Array(n).fill(0)
  t[0] = m[0]
  t[n - 1] = m[n - 2]
  for (let i = 1; i < n - 1; i += 1) {
    t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2
  }
  for (let i = 0; i < n - 1; i += 1) {
    if (Math.abs(m[i]) < 1e-8) {
      t[i] = 0
      t[i + 1] = 0
    } else {
      const a = t[i] / m[i]
      const b = t[i + 1] / m[i]
      const s = a * a + b * b
      if (s > 9) {
        const k = 3 / Math.sqrt(s)
        t[i] = k * a * m[i]
        t[i + 1] = k * b * m[i]
      }
    }
  }
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const c1x = p0.x + dx[i] / 3
    const c1y = p0.y + (t[i] * dx[i]) / 3
    const c2x = p1.x - dx[i] / 3
    const c2y = p1.y - (t[i + 1] * dx[i]) / 3
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`
  }
  return d
}

function LineChart({ data }: { data: { date: string; value: number }[] }) {
  if (data.length < 2) {
    return <div className="flex h-full items-center justify-center text-xs text-white/30">추이를 불러오는 중</div>
  }
  const w = 640
  const h = 148
  const left = 4
  const right = 4
  const top = 8
  const bottom = 28
  const max = Math.max(...data.map((row) => row.value))
  const min = Math.min(...data.map((row) => row.value))
  const span = max - min || 1
  const points = data.map((row, index) => ({
    x: left + (index / (data.length - 1)) * (w - left - right),
    y: top + (1 - (row.value - min) / span) * (h - top - bottom),
  }))
  const line = monotonePath(points)
  const area = `${line} L ${points[points.length - 1].x} ${h - bottom} L ${points[0].x} ${h - bottom} Z`
  const ticks = 7
  const labels = Array.from({ length: ticks }, (_, index) => {
    const i = Math.round((index / (ticks - 1)) * (data.length - 1))
    return { i, x: points[i].x, text: formatKoMd(data[i].date) }
  }).filter((row, index, rows) => rows.findIndex((item) => item.i === row.i) === index)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full overflow-visible">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((index) => {
        const y = top + ((h - top - bottom) * index) / 3
        return (
          <line
            key={index}
            x1={left}
            x2={w - right}
            y1={y}
            y2={y}
            stroke="rgba(255,255,255,0.1)"
            strokeDasharray="4 6"
          />
        )
      })}
      <path d={area} fill="url(#trendFill)" />
      <path d={line} fill="none" stroke="#8B5CF6" strokeWidth="2.4" strokeLinecap="round" />
      {labels.map((label) => (
        <text
          key={`${label.i}-${label.text}`}
          x={label.x}
          y={h - 6}
          textAnchor="middle"
          fill="#6B7280"
          fontSize="10"
        >
          {label.text}
        </text>
      ))}
    </svg>
  )
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        {icon}
        {title}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-white/45">{text}</p>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2.5">
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  )
}
