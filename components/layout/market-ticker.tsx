'use client'

import { useEffect, useState } from 'react'
import { MarketIcon } from '@/components/market-icons'
import {
  emptyMarketItems,
  formatChange,
  formatKrw,
  formatUsd,
  mergeMarketItems,
  type MarketsPayload,
} from '@/lib/markets'
import { cn } from '@/lib/utils'

const POLL_MS = 20_000
const STORAGE_KEY = 'mostem:markets-v1'

function readStored(): MarketsPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MarketsPayload
    if (!Array.isArray(parsed?.items) || parsed.items.length === 0) return null
    return parsed
  } catch {
    return null
  }
}

function writeStored(data: MarketsPayload) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

export function MarketTicker() {
  const [data, setData] = useState<MarketsPayload | null>(null)

  useEffect(() => {
    const stored = readStored()
    if (stored) setData(stored)

    let alive = true
    async function load() {
      try {
        const res = await fetch('/api/markets', { cache: 'no-store' })
        if (!res.ok || !alive) return
        const next = (await res.json()) as MarketsPayload
        if (!Array.isArray(next?.items)) return
        setData((prev) => {
          const mergedItems = mergeMarketItems(prev?.items ?? stored?.items, next.items)
          const merged = { now: next.now ?? Date.now(), items: mergedItems }
          writeStored(merged)
          return merged
        })
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

  const items = data?.items ?? emptyMarketItems()

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
