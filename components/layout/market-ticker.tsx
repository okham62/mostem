'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MarketIcon } from '@/components/market-icons'
import { subscribeLiveMarkets } from '@/lib/live-markets'
import { emptyMarketItems, formatChange, formatKrw, formatUsd, type MarketItem } from '@/lib/markets'
import { cn } from '@/lib/utils'

const MAX_SCALE = 1.42
const INFLUENCE = 86

function dockScale(distance: number) {
  if (distance >= INFLUENCE) return 1
  return 1 + (MAX_SCALE - 1) * Math.cos((distance / INFLUENCE) * (Math.PI / 2)) ** 2
}

let hideNow = false
const hideListeners = new Set<(hidden: boolean) => void>()

export function previewHideMarketTicker(hidden: boolean) {
  hideNow = hidden
  hideListeners.forEach((fn) => fn(hidden))
}

function isMarketsPath(pathname: string) {
  return pathname === '/markets' || pathname.startsWith('/markets/')
}

export function MarketTicker() {
  const pathname = usePathname()
  const [items, setItems] = useState<MarketItem[]>(emptyMarketItems)
  const [forcedHide, setForcedHide] = useState(hideNow)
  const rowRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef(0)
  const onMarkets = forcedHide || isMarketsPath(pathname)

  useEffect(() => subscribeLiveMarkets(setItems), [])

  useEffect(() => {
    hideListeners.add(setForcedHide)
    setForcedHide(hideNow)
    return () => {
      hideListeners.delete(setForcedHide)
    }
  }, [])

  useEffect(() => {
    if (!isMarketsPath(pathname)) previewHideMarketTicker(false)
  }, [pathname])

  function paint(clientX: number | null) {
    const row = rowRef.current
    if (!row) return
    for (const node of Array.from(row.children)) {
      const wrap = node as HTMLElement
      const chip = wrap.firstElementChild as HTMLElement | null
      if (!chip) continue
      if (clientX == null) {
        chip.style.transform = 'scale(1) translateY(0px)'
        continue
      }
      const rect = wrap.getBoundingClientRect()
      const distance = Math.abs(clientX - (rect.left + rect.width / 2))
      const scale = dockScale(distance)
      const lift = (scale - 1) * 10
      chip.style.transform = `scale(${scale.toFixed(3)}) translateY(${lift.toFixed(1)}px)`
    }
  }

  function onMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const x = event.clientX
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => paint(x))
  }

  function onLeave() {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    paint(null)
  }

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  if (onMarkets) return null

  return (
    <div className="sticky top-0 z-30 overflow-visible border-b border-[var(--card-border)] bg-[var(--ticker-bg)]">
      <div
        ref={rowRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="flex flex-nowrap items-start justify-center gap-2 overflow-x-auto px-3 pb-4 pt-2 scrollbar-thin md:gap-2.5 md:px-4"
      >
        {items.map((item) => {
          const up = (item.change ?? 0) > 0
          const down = (item.change ?? 0) < 0
          return (
            <div key={item.id} className="flex shrink-0">
              <Link
                href="/markets"
                onClick={() => previewHideMarketTicker(true)}
                className="inline-flex origin-top items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5 will-change-transform hover:border-white/35 hover:bg-white/10 [transition:transform_40ms_linear]"
              >
                <MarketIcon id={item.id} className="h-6 w-6" />
                <span className="text-[13px] font-bold tracking-tight text-white">{item.label}</span>
                <span className="text-[13px] font-bold text-gold">{formatKrw(item.krw)}</span>
                {item.kind === 'coin' ? (
                  <span className="text-[13px] font-semibold text-white/70">{formatUsd(item.usd)}</span>
                ) : null}
                {item.change != null ? (
                  <span
                    className={cn(
                      'text-xs font-extrabold',
                      up && 'text-[var(--change-up)]',
                      down && 'text-[var(--change-down)]',
                      !up && !down && 'text-white/50',
                    )}
                  >
                    {formatChange(item.change)}
                  </span>
                ) : null}
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
