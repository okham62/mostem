'use client'

import { useEffect, useState } from 'react'
import { MarketIcon } from '@/components/market-icons'
import { subscribeLiveMarkets } from '@/lib/live-markets'
import { emptyMarketItems, formatChange, formatKrw, formatUsd, type MarketItem } from '@/lib/markets'
import { cn } from '@/lib/utils'

export function MarketTicker() {
  const [items, setItems] = useState<MarketItem[]>(emptyMarketItems)

  useEffect(() => subscribeLiveMarkets(setItems), [])

  return (
    <div className="sticky top-0 z-30 border-b border-[var(--card-border)] bg-[#0c0e14]">
      <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2 md:gap-2.5 md:px-4">
        {items.map((item) => {
          const up = (item.change ?? 0) > 0
          const down = (item.change ?? 0) < 0
          return (
            <div
              key={item.id}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5"
            >
              <MarketIcon id={item.id} className="h-5 w-5" />
              <span className="text-[13px] font-bold tracking-tight text-white">{item.label}</span>
              <span className="text-[13px] font-bold text-gold">{formatKrw(item.krw)}</span>
              {item.kind === 'coin' ? (
                <span className="text-[13px] font-semibold text-white/70">{formatUsd(item.usd)}</span>
              ) : null}
              {item.change != null ? (
                <span
                  className={cn(
                    'text-xs font-bold',
                    up && 'text-red-400',
                    down && 'text-sky-400',
                    !up && !down && 'text-white/50',
                  )}
                >
                  {formatChange(item.change)}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
