'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { MarketIcon } from '@/components/market-icons'
import { subscribeLiveMarkets } from '@/lib/live-markets'
import {
  formatIndex,
  type ChartSeriesId,
  type IndexQuote,
  type MarketChartsPayload,
} from '@/lib/market-charts'
import { emptyMarketItems, formatChange, formatKrw, formatUsd, type MarketItem } from '@/lib/markets'
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

  useEffect(() => {
    let alive = true
    void fetch('/api/markets/charts', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: MarketChartsPayload | null) => {
        if (alive && data?.series) setCharts(data)
      })
      .catch(() => {})
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
              extra={formatUsd(item.usd)}
              change={item.change}
              points={charts?.series?.[item.id]}
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
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function MarketCard({
  title,
  icon,
  price,
  extra,
  change,
  points,
}: {
  title: string
  icon?: ReactNode
  price: string
  extra?: string
  change: number | null
  points?: number[]
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
      {extra ? <p className="mt-0.5 text-xs text-white/45">{extra}</p> : null}
      <Sparkline points={points} />
    </article>
  )
}

function Sparkline({ points }: { points?: number[] }) {
  const gid = useId().replace(/:/g, '')
  if (!points || points.length < 2) {
    return <div className="mt-4 h-12 w-full rounded-md bg-white/[0.04]" />
  }

  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const w = 200
  const h = 48
  const path = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * w
      const y = h - ((value - min) / span) * (h - 6) - 3
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  const up = points[points.length - 1] >= points[0]
  const color = up ? 'var(--change-up)' : 'var(--change-down)'

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-4 h-12 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
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
    </svg>
  )
}
