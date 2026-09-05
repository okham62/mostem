'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MarketIcon } from '@/components/market-icons'
import { subscribeLiveMarkets } from '@/lib/live-markets'
import { emptyMarketItems, formatChange, formatKrw, formatUsd, type MarketItem } from '@/lib/markets'
import { cn } from '@/lib/utils'

const RANGE = 96
const MAX_SCALE = 1.2

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
    if (!row) return
    const pills = row.querySelectorAll<HTMLElement>('[data-ticker-pill]')
    if (!pointRef.current.on) {
      pills.forEach((el) => {
        el.style.transform = 'translate3d(0,0,0) scale(1)'
        el.style.zIndex = '0'
      })
      return
    }

    const { x, y } = pointRef.current
    pills.forEach((el) => {
      const box = el.getBoundingClientRect()
      const dx = x - (box.left + box.width / 2)
      const dy = y - (box.top + box.height / 2)
      const t = Math.max(0, 1 - Math.hypot(dx, dy) / RANGE)
      const ease = t * t * (3 - 2 * t)
      const scale = 1 + (MAX_SCALE - 1) * ease
      const ox = Math.min(box.width, Math.max(0, x - box.left))
      const oy = Math.min(box.height, Math.max(0, y - box.top))
      el.style.transformOrigin = `${ox}px ${oy}px`
      el.style.transform = `translate3d(0, ${(-7 * ease).toFixed(2)}px, 0) scale(${scale.toFixed(3)})`
      el.style.zIndex = String(Math.round(1 + ease * 20))
    })
  }

  function queuePaint() {
    if (frameRef.current) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0
      paint()
    })
  }

  function onMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    pointRef.current = { x: event.clientX, y: event.clientY, on: true }
    queuePaint()
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
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="sticky top-0 z-30 overflow-x-clip overflow-y-visible border-b border-[var(--card-border)] bg-[var(--ticker-bg)]"
    >
      <div
        ref={rowRef}
        className="flex flex-nowrap items-center justify-start gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:none] [-ms-overflow-style:none] md:justify-center md:gap-2.5 md:px-4 md:py-3.5 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const up = (item.change ?? 0) > 0
          const down = (item.change ?? 0) < 0
          return (
            <div key={item.id} className="relative flex shrink-0">
              <Link
                href="/markets"
                data-ticker-pill
                onClick={() => previewHideMarketTicker(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] px-2.5 py-1 will-change-transform [transition:transform_160ms_cubic-bezier(0.22,1,0.36,1)] hover:border-white/40 hover:bg-white/10 md:gap-2 md:px-3 md:py-1.5"
              >
                <MarketIcon id={item.id} className="h-5 w-5 md:h-6 md:w-6" />
                <span className="text-[12px] font-bold tracking-tight text-white md:text-[13px]">{item.label}</span>
                <span className="text-[12px] font-bold text-gold md:text-[13px]">{formatKrw(item.krw)}</span>
                {item.kind === 'coin' ? (
                  <span className="hidden text-[13px] font-semibold text-white/80 md:inline">{formatUsd(item.usd)}</span>
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
