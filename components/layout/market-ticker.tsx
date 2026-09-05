'use client'

import { useEffect, useState } from 'react'
import { formatChange, formatKrw, formatUsd, type MarketsPayload } from '@/lib/markets'
import { cn } from '@/lib/utils'

const POLL_MS = 20_000

const FALLBACK: Record<string, string> = {
  usd: 'https://flagcdn.com/w80/us.png',
  cny: 'https://flagcdn.com/w80/cn.png',
  btc: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  eth: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  xrp: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  sol: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
}

export function MarketTicker() {
  const [data, setData] = useState<MarketsPayload | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch('/api/markets', { cache: 'no-store' })
        if (!res.ok || !alive) return
        setData(await res.json())
      } catch {
        /* keep previous */
      }
    }
    void load()
    const id = window.setInterval(load, POLL_MS)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])

  const items = data?.items ?? []

  return (
    <div className="sticky top-0 z-30 border-b border-[var(--card-border)] bg-[#0c0e14]/95 backdrop-blur-md">
      <div className="mostem-marquee overflow-hidden">
        <div className="mostem-marquee-track flex min-w-full items-center gap-2 px-3 py-1.5 md:px-4">
          {(items.length ? [...items, ...items] : []).map((item, index) => {
            const up = (item.change ?? 0) > 0
            const down = (item.change ?? 0) < 0
            return (
              <div
                key={`${item.id}-${index}`}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt=""
                  className="h-4 w-4 rounded-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK[item.id] || item.image
                  }}
                />
                <span className="text-[11px] font-semibold text-white/70">{item.label}</span>
                <span className="text-[11px] font-bold text-gold">{formatKrw(item.krw)}</span>
                {item.kind === 'coin' ? (
                  <span className="text-[11px] text-white/45">{formatUsd(item.usd)}</span>
                ) : null}
                {item.change != null ? (
                  <span className={cn('text-[10px] font-bold', up && 'text-red-400', down && 'text-sky-400', !up && !down && 'text-white/35')}>
                    {formatChange(item.change)}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
