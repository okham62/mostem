'use client'

import { useEffect, useId, useLayoutEffect, useState, type PointerEvent, type ReactNode } from 'react'
import { MarketIcon } from '@/components/market-icons'
import { subscribeLiveMarkets } from '@/lib/live-markets'
import {
  fetchBrowserMarketCharts,
  formatIndex,
  mergeMarketCharts,
  type ChartSeriesId,
  type IndexQuote,
  type MarketChartsPayload,
} from '@/lib/market-charts'
import { emptyMarketItems, formatChange, formatKrw, formatUsd, type MarketItem } from '@/lib/markets'
import { fetchMarketCharts, peekMarketCharts, writeMarketCharts } from '@/lib/market-cache'
import { cn } from '@/lib/utils'

const EMPTY_INDICES: IndexQuote[] = [
  { id: 'spx', label: 'S&P 500', note: '미국 대표 지수', value: null, change: null },
  { id: 'nasdaq', label: '나스닥', note: '미국 기술주 지수', value: null, change: null },
  { id: 'kospi', label: '코스피', note: '한국 유가증권시장', value: null, change: null },
  { id: 'kosdaq', label: '코스닥', note: '한국 코스닥 시장', value: null, change: null },
]

export function MarketsClient() {
  const [items, setItems] = useState<MarketItem[]>(emptyMarketItems)
  const [charts, setCharts] = useState<MarketChartsPayload | null>(null)

  useEffect(() => subscribeLiveMarkets(setItems), [])

  useLayoutEffect(() => {
    const cached = peekMarketCharts()
    if (cached) setCharts(cached)
  }, [])

  useEffect(() => {
    let alive = true
    const apply = (data: MarketChartsPayload | null) => {
      if (!alive || !data) return
      setCharts((prev) => {
        const merged = mergeMarketCharts(prev ?? peekMarketCharts(), data)
        if (merged) writeMarketCharts(merged)
        return merged
      })
    }
    void fetchBrowserMarketCharts().then(apply).catch(() => {})
    void fetchMarketCharts().then(apply).catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const fx = items.filter((item) => item.kind === 'fx')
  const coins = items.filter((item) => item.kind === 'coin')
  const indices = charts?.indices?.length ? charts.indices : EMPTY_INDICES

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/45">최근 7일 흐름을 카드 아래 그래프로 봅니다.</p>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">환율</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {fx.map((item) => (
            <MarketCard
              key={item.id}
              title={item.label}
              icon={<MarketIcon id={item.id} className="h-7 w-7" />}
              price={formatKrw(item.krw)}
              change={item.change ?? charts?.fxChange?.[item.id === 'cny' ? 'cny' : 'usd'] ?? null}
              points={charts?.series?.[item.id]}
              formatPoint={formatKrw}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">코인</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {coins.map((item) => (
            <MarketCard
              key={item.id}
              title={item.label}
              icon={<MarketIcon id={item.id} className="h-7 w-7" />}
              price={formatKrw(item.krw)}
              usd={formatUsd(item.usd)}
              change={item.change}
              points={charts?.series?.[item.id]}
              formatPoint={coinPointFormat(charts?.series?.[item.id], item)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">지수 · 주식</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {indices.map((item) => (
            <MarketCard
              key={item.id}
              title={item.label}
              extra={item.note}
              price={formatIndex(item.value)}
              change={item.change}
              points={charts?.series?.[item.id as ChartSeriesId]}
              formatPoint={formatIndex}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function coinPointFormat(points: number[] | undefined, item: MarketItem) {
  const last = points?.at(-1)
  if (last == null) return formatKrw
  const usdScore = item.usd ? Math.abs(last / item.usd - 1) : Number.POSITIVE_INFINITY
  const krwScore = item.krw ? Math.abs(last / item.krw - 1) : Number.POSITIVE_INFINITY
  return usdScore <= krwScore ? formatUsd : formatKrw
}

function MarketCard({
  title,
  icon,
  price,
  extra,
  usd,
  change,
  points,
  formatPoint,
}: {
  title: string
  icon?: ReactNode
  price: string
  extra?: string
  usd?: string
  change: number | null
  points?: number[]
  formatPoint: (value: number | null) => string
}) {
  const up = (change ?? 0) > 0
  const down = (change ?? 0) < 0

  return (
    <article className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <p className="truncate text-sm font-bold text-white">{title}</p>
        </div>
        {change != null ? (
          <p
            className={cn(
              'shrink-0 text-xs font-extrabold',
              up && 'text-[var(--change-up)]',
              down && 'text-[var(--change-down)]',
              !up && !down && 'text-white/40'
            )}
          >
            {formatChange(change)}
          </p>
        ) : null}
      </div>
      <p className="mt-3 text-xl font-bold text-gold">{price}</p>
      {usd ? (
        <p className="mt-1 text-xl font-bold tabular-nums text-white">{usd}</p>
      ) : extra ? (
        <p className="mt-0.5 text-xs text-white/45">{extra}</p>
      ) : null}
      <Sparkline points={points} formatPoint={formatPoint} />
    </article>
  )
}

function Sparkline({
  points,
  formatPoint,
}: {
  points?: number[]
  formatPoint: (value: number | null) => string
}) {
  const gid = useId().replace(/:/g, '')
  const [hover, setHover] = useState<{ x: number; y: number; value: number } | null>(null)
  const series: number[] = points ?? []

  if (series.length < 2) {
    return <div className="mt-4 h-12 w-full rounded-md bg-white/[0.04]" />
  }

  const min = Math.min(...series)
  const max = Math.max(...series)
  const span = max - min || 1
  const w = 200
  const h = 48
  const toY = (value: number) => h - ((value - min) / span) * (h - 6) - 3
  const path = series
    .map((value, index) => {
      const x = (index / (series.length - 1)) * w
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${toY(value).toFixed(1)}`
    })
    .join(' ')
  const up = series[series.length - 1] >= series[0]
  const color = up ? 'var(--change-up)' : 'var(--change-down)'

  function onMove(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const pos = ratio * (series.length - 1)
    const left = Math.floor(pos)
    const right = Math.min(series.length - 1, left + 1)
    const t = pos - left
    const value = (series[left] ?? 0) * (1 - t) + (series[right] ?? 0) * t
    setHover({ x: ratio * w, y: toY(value), value })
  }

  const labelSide = hover && hover.x > w * 0.72 ? '-100%' : hover && hover.x < w * 0.28 ? '0' : '-50%'
  const labelLift = hover && hover.y < 18 ? '6px' : 'calc(-100% - 6px)'

  return (
    <div className="relative mt-4">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-12 w-full cursor-crosshair overflow-visible"
        preserveAspectRatio="none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width={w} height={h} fill="transparent" />
        <path d={`${path} L${w} ${h} L0 ${h} Z`} fill={`url(#${gid}-fill)`} />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {hover ? (
          <>
            <line
              x1={hover.x}
              y1="0"
              x2={hover.x}
              y2={h}
              stroke="white"
              strokeOpacity="0.22"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={hover.x}
              cy={hover.y}
              r="3.2"
              fill={color}
              stroke="white"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : null}
      </svg>
      {hover ? (
        <div
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white shadow-lg ring-1 ring-white/15"
          style={{
            left: `${(hover.x / w) * 100}%`,
            top: `${(hover.y / h) * 100}%`,
            transform: `translate(${labelSide}, ${labelLift})`,
          }}
        >
          {formatPoint(hover.value)}
        </div>
      ) : null}
    </div>
  )
}
