'use client'

import { useEffect, useMemo, useState } from 'react'
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
  TrendingUp,
  WandSparkles,
  X,
} from 'lucide-react'
import {
  formatGrowth,
  formatTrendDate,
  isLikelyBrand,
  type CompareWeeks,
  type TrendDetail,
  type TrendKeyword,
  type TrendsPayload,
  type TrendTab,
} from '@/lib/trends'
import { cn } from '@/lib/utils'

const POLL_MS = 5 * 60_000

const TABS: { id: TrendTab; label: string; hint: string }[] = [
  { id: 'rising', label: '지금 뜨는 키워드', hint: '최근 검색이 빠르게 오른 키워드예요.' },
  { id: 'popular', label: '많이 찾는 키워드', hint: '지금 가장 많이 찾는 쇼핑 검색어예요.' },
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
  const [featureIndex, setFeatureIndex] = useState(0)
  const [selected, setSelected] = useState<TrendKeyword | null>(null)

  async function reload(nextCompare = compare) {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/trends?compare=${nextCompare}`, { cache: 'no-store' })
      if (!res.ok) return
      const next = (await res.json()) as TrendsPayload
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
  }, [compare])

  useEffect(() => {
    if (data.featured.length < 2) return
    const id = window.setInterval(
      () => setFeatureIndex((i) => (i + 1) % data.featured.length),
      5000
    )
    return () => window.clearInterval(id)
  }, [data.featured.length])

  const filtered = useMemo(() => {
    let rows = data.items
    if (category !== 'all') rows = rows.filter((item) => item.cid === category)
    if (content === 'purchase') rows = rows.filter((item) => item.contentType === 'purchase')
    if (content === 'info') rows = rows.filter((item) => item.contentType === 'info')
    if (timing === 'now') rows = rows.filter((item) => item.peakNow)
    if (timing === 'steady') rows = rows.filter((item) => !item.isNew && item.growth >= 0 && item.growth < 25)
    if (excludeBrand) rows = rows.filter((item) => !isLikelyBrand(item.keyword))
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      rows = rows.filter((item) => item.keyword.toLowerCase().includes(q))
    }
    if (tab === 'rising') rows = [...rows].sort((a, b) => b.growth - a.growth || b.score - a.score)
    if (tab === 'popular') rows = [...rows].sort((a, b) => a.rank - b.rank || b.score - a.score)
    if (tab === 'new') rows = rows.filter((item) => item.isNew)
    return rows.slice(0, 40)
  }, [data.items, category, content, timing, excludeBrand, query, tab])

  const featured = data.featured[featureIndex] ?? data.featured[0] ?? filtered[0]
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
          <p className="text-[11px] text-white/30">
            데이터 기준 {formatTrendDate(data.now)} · 5분마다 자동 확인
          </p>
        </div>
      </div>

      {featured ? (
        <button
          type="button"
          onClick={() => setSelected(featured)}
          className="flex w-full items-center justify-between gap-4 rounded-2xl bg-[#1b1530] px-5 py-4 text-left"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-brand-300">지금 주목할 키워드</p>
            <p className="mt-1 truncate text-lg font-bold text-white">
              <span className="mr-2 text-brand-300">{featureIndex + 1}</span>
              {featured.keyword}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-red-400">{formatGrowth(featured.growth, featured.isNew)}</p>
            <p className="mt-1 text-[11px] text-white/40">
              {featureIndex + 1}/{Math.max(data.featured.length, 1)}
            </p>
          </div>
        </button>
      ) : null}

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 md:p-5">
        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => {
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition',
                  item.id === 'rising' && active && 'bg-gold/15 text-gold',
                  item.id === 'popular' && active && 'bg-brand/25 text-white',
                  item.id === 'new' && active && 'bg-emerald-500/15 text-emerald-300',
                  !active && 'text-white/45 hover:bg-white/5 hover:text-white'
                )}
              >
                {item.id === 'rising' ? <Flame className="h-3.5 w-3.5" /> : null}
                {item.id === 'popular' ? <TrendingUp className="h-3.5 w-3.5" /> : null}
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
            onChange={setCategory}
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
            onChange={(id) => {
              const next = Number(id) as CompareWeeks
              setCompare(next)
              void reload(next)
            }}
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
              onChange={(event) => setQuery(event.target.value)}
              placeholder="키워드 검색"
              className="h-9 w-full rounded-lg bg-black/30 pl-8 pr-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/30"
            />
          </label>
        </div>

        <div className="mt-2 divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-white/35">조건에 맞는 키워드가 없습니다.</div>
          ) : (
            filtered.map((item, index) => (
              <button
                key={`${item.cid}-${item.keyword}`}
                type="button"
                onClick={() => setSelected(item)}
                className="flex w-full items-center gap-4 py-3.5 text-left hover:bg-white/[0.03]"
              >
                <span className="w-8 shrink-0 text-xl font-bold text-brand-400">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-white">{item.keyword}</span>
                    {item.peakNow ? (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                        성수기 지금!
                      </span>
                    ) : null}
                    {item.isNew ? (
                      <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/60">
                        이번 달 신규
                      </span>
                    ) : (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                        {formatGrowth(item.growth, item.isNew)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-white/35">
                    {item.category} · {item.intent}
                  </p>
                </div>
                <Sparkline points={item.spark} up={item.growth >= 0} />
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
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-black/30 px-3 text-xs text-white/70 ring-1 ring-white/10"
      >
        {value}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="mostem-press-panel absolute left-0 top-full z-30 mt-1 min-w-[180px] rounded-xl border border-[var(--card-border)] bg-[#16161b] py-1 shadow-2xl">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-white/70 hover:bg-white/5 hover:text-white"
            >
              {option.label}
              {option.label === value ? <Check className="h-3.5 w-3.5 text-gold" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  const w = 88
  const h = 28
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
  const [detail, setDetail] = useState<TrendDetail | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(`/api/trends/detail?keyword=${encodeURIComponent(item.keyword)}&cid=${item.cid}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((next) => {
        if (alive) setDetail(next as TrendDetail | null)
      })
      .catch(() => {
        if (alive) setDetail(null)
      })
    return () => {
      alive = false
    }
  }, [item.keyword, item.cid])

  async function copyKeyword() {
    await navigator.clipboard.writeText(item.keyword)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#121218] p-5 shadow-2xl scrollbar-thin"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <WandSparkles className="h-4 w-4 text-brand-400" />
              <h2 className="text-lg font-bold text-white">{item.keyword}</h2>
              <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold text-black">
                {formatGrowth(item.growth, item.isNew)}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-[#1b1530] p-4">
          <p className="flex items-center gap-2 text-xs text-brand-300">
            <Calendar className="h-3.5 w-3.5" />
            언제 올리면 좋을까요?
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {detail?.advice || '검색 추이를 불러오는 중입니다.'}
          </p>
        </div>

        <ChartBlock title="1년 중 언제 많이 찾나요 (월별 검색량)">
          <BarChart data={detail?.monthly ?? []} peakMonth={detail?.peakMonth} />
        </ChartBlock>
        <ChartBlock title="최근 30일 검색 추이">
          <LineChart data={detail?.daily ?? []} />
        </ChartBlock>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <InfoCard
            icon={<ShoppingBag className="h-4 w-4 text-brand-300" />}
            title="구매글"
            text={detail?.contentHint || '상품 추천·리뷰 글에 잘 맞아요.'}
          />
          <InfoCard
            icon={<Target className="h-4 w-4 text-white/50" />}
            title="블루오션"
            text={detail?.oceanHint || '관심 흐름을 보고 선점해 보세요.'}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatCard label="검색지수" value={detail ? String(detail.index) : '…'} />
          <StatCard label="30일 변화" value={detail?.change || '…'} />
          <StatCard label="성수기" value={detail ? `${detail.peakMonth}월` : '…'} />
          <StatCard label="분야" value={item.category} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(item.keyword + ' threads')}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-2 text-xs font-semibold text-white"
          >
            쓰레드에서 반응 보기
          </a>
          <a
            href={`https://search.naver.com/search.naver?query=${encodeURIComponent(item.keyword)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-2 text-xs text-white/80"
          >
            네이버 검색
          </a>
          <a
            href={`https://search.shopping.naver.com/search/all?query=${encodeURIComponent(item.keyword)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-2 text-xs text-white/80"
          >
            쇼핑 검색
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            type="button"
            onClick={() => void copyKeyword()}
            className="ml-auto inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white"
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
      <p className="mb-2 text-xs text-white/40">{title}</p>
      <div className="h-36 rounded-xl bg-black/30 px-3 py-3">{children}</div>
    </div>
  )
}

function BarChart({
  data,
  peakMonth,
}: {
  data: { month: number; value: number }[]
  peakMonth?: number
}) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const map = new Map(data.map((row) => [row.month, row.value]))
  const max = Math.max(1, ...data.map((row) => row.value))
  return (
    <div className="flex h-full items-end gap-1">
      {months.map((month) => {
        const value = map.get(month) ?? 0
        const peak = month === peakMonth
        return (
          <div key={month} className="flex flex-1 flex-col items-center justify-end gap-1">
            <div
              className={cn('w-full rounded-sm', peak ? 'bg-gold' : 'bg-brand-500')}
              style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
            />
            <span className="text-[9px] text-white/30">{month}</span>
          </div>
        )
      })}
    </div>
  )
}

function LineChart({ data }: { data: { date: string; value: number }[] }) {
  if (data.length < 2) {
    return <div className="flex h-full items-center justify-center text-xs text-white/30">추이를 불러오는 중</div>
  }
  const w = 560
  const h = 110
  const max = Math.max(...data.map((row) => row.value))
  const min = Math.min(...data.map((row) => row.value))
  const pts = data.map((row, index) => {
    const x = (index / (data.length - 1)) * w
    const y = h - ((row.value - min) / (max - min || 1)) * (h - 8) - 4
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full overflow-visible">
      <polyline points={pts.join(' ')} fill="none" stroke="#a78bfa" strokeWidth="2.2" />
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
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}
