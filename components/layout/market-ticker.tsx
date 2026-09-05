'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MarketIcon } from '@/components/market-icons'
import { subscribeLiveMarkets } from '@/lib/live-markets'
import { emptyMarketItems, formatChange, formatKrw, formatUsd, type MarketItem } from '@/lib/markets'
import { cn } from '@/lib/utils'

const LENS = 72
const ZOOM = 1.28

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
  const hostRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const lensRef = useRef<HTMLDivElement>(null)
  const cloneRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef(0)
  const pointRef = useRef({ x: 0, y: 0, on: false })
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

  function paint() {
    const row = rowRef.current
    const lens = lensRef.current
    const clone = cloneRef.current
    if (!row || !lens || !clone) return
    if (!pointRef.current.on) {
      lens.style.opacity = '0'
      return
    }
    const { x, y } = pointRef.current
    const half = LENS / 2
    lens.style.opacity = '1'
    lens.style.transform = `translate3d(${x - half}px, ${y - half}px, 0)`
    clone.style.width = `${row.offsetWidth}px`
    clone.style.height = `${row.offsetHeight}px`
    clone.style.transform = `translate3d(${half - x * ZOOM}px, ${half - y * ZOOM}px, 0) scale(${ZOOM})`
  }

  function onMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const host = hostRef.current
    const row = rowRef.current
    if (!host || !row) return
    const rect = host.getBoundingClientRect()
    pointRef.current = {
      x: event.clientX - rect.left + row.scrollLeft,
      y: event.clientY - rect.top,
      on: true,
    }
    if (frameRef.current) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0
      paint()
    })
  }

  function onLeave() {
    pointRef.current.on = false
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
    paint()
  }

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  if (onMarkets) return null

  return (
    <div
      ref={hostRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative sticky top-0 z-30 overflow-x-clip overflow-y-visible border-b border-[var(--card-border)] bg-[var(--ticker-bg)]"
    >
      <div
        ref={rowRef}
        className="flex flex-nowrap items-center justify-center gap-2 overflow-x-auto overflow-y-hidden px-3 py-2.5 [scrollbar-width:none] [-ms-overflow-style:none] md:gap-2.5 md:px-4 [&::-webkit-scrollbar]:hidden"
      >
        <TickerPills items={items} />
      </div>
      <div
        ref={lensRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-10 overflow-hidden rounded-full border border-white/25 bg-[var(--ticker-bg)] opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.45)] will-change-transform"
        style={{ width: LENS, height: LENS }}
      >
        <div
          ref={cloneRef}
          className="absolute left-0 top-0 box-border flex flex-nowrap items-center justify-center gap-2 px-3 py-2.5 will-change-transform md:gap-2.5 md:px-4"
          style={{ transformOrigin: '0 0' }}
        >
          <TickerPills items={items} inert />
        </div>
      </div>
    </div>
  )
}

function TickerPills({ items, inert }: { items: MarketItem[]; inert?: boolean }) {
  return (
    <>
      {items.map((item) => {
        const up = (item.change ?? 0) > 0
        const down = (item.change ?? 0) < 0
        return (
          <div key={item.id} className="flex shrink-0">
            <Link
              href="/markets"
              tabIndex={inert ? -1 : 0}
              onClick={() => previewHideMarketTicker(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5 hover:border-white/35 hover:bg-white/10"
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
    </>
  )
}
