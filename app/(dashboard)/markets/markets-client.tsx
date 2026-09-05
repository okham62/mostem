'use client'

import { useEffect, useState } from 'react'
import { MarketIcon } from '@/components/market-icons'
import { subscribeLiveMarkets } from '@/lib/live-markets'
import { emptyMarketItems, formatChange, formatKrw, formatUsd, type MarketItem } from '@/lib/markets'
import { cn } from '@/lib/utils'

export function MarketsClient() {
  const [items, setItems] = useState<MarketItem[]>(emptyMarketItems)

  useEffect(() => subscribeLiveMarkets(setItems), [])

  const fx = items.filter((item) => item.kind === 'fx')
  const coins = items.filter((item) => item.kind === 'coin')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">마켓 시세</h1>
        <p className="mt-1 text-sm text-white/45">
          환율, 코인, 주식, 지수를 한 화면에서 봅니다. 상단 시세를 눌러도 이 페이지로 옵니다.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">환율</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {fx.map((item) => (
            <QuoteCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">코인</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {coins.map((item) => (
            <QuoteCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">지수 · 주식</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {INDEX_PLACEHOLDERS.map((item) => (
            <div
              key={item.name}
              className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4"
            >
              <p className="text-sm font-bold text-white">{item.name}</p>
              <p className="mt-1 text-xs text-white/40">{item.note}</p>
              <p className="mt-4 text-lg font-bold text-white/25">준비 중</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

const INDEX_PLACEHOLDERS = [
  { name: 'S&P 500', note: '미국 대표 지수' },
  { name: '나스닥', note: '미국 기술주 지수' },
  { name: '코스피', note: '한국 유가증권시장' },
  { name: '코스닥', note: '한국 코스닥 시장' },
]

function QuoteCard({ item }: { item: MarketItem }) {
  const up = (item.change ?? 0) > 0
  const down = (item.change ?? 0) < 0

  return (
    <article
      id={item.id}
      className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <MarketIcon id={item.id} className="h-8 w-8" />
        <p className="text-sm font-bold text-white">{item.label}</p>
      </div>
      <p className="text-xl font-bold text-gold">{formatKrw(item.krw)}</p>
      {item.kind === 'coin' ? (
        <p className="mt-1 text-sm font-semibold text-white/70">{formatUsd(item.usd)}</p>
      ) : null}
      {item.change != null ? (
        <p
          className={cn(
            'mt-2 text-sm font-extrabold',
            up && 'text-[#39FF14]',
            down && 'text-red-500',
            !up && !down && 'text-white/40'
          )}
        >
          {formatChange(item.change)}
        </p>
      ) : null}
    </article>
  )
}
