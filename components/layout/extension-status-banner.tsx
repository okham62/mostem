'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const PING_SOURCE = 'hami-extension'
const STALE_MS = 3500
const FIRST_CHECK_MS = 800
const POLL_MS = 400
const MESSAGE = '확장이 꺼져있어요. chrome://extensions에서 hami를 다시 켜주세요'
const LABEL = `[ ${MESSAGE} ]`

function isHamiPing(data: unknown): data is { source: string; type: string; at?: number } {
  if (!data || typeof data !== 'object') return false
  const value = data as { source?: unknown; type?: unknown }
  return value.source === PING_SOURCE && value.type === 'ping'
}

export function ExtensionStatusBanner() {
  const [online, setOnline] = useState<boolean | null>(null)
  const bannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let lastPing = Number(document.documentElement.getAttribute('data-hami-at') || 0)

    const mark = (at?: number) => {
      lastPing = Math.max(lastPing, at ?? Date.now())
    }

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return
      if (!isHamiPing(event.data)) return
      mark(typeof event.data.at === 'number' ? event.data.at : Date.now())
    }

    const tick = () => {
      const attr = Number(document.documentElement.getAttribute('data-hami-at') || 0)
      if (attr > lastPing) lastPing = attr
      setOnline(Date.now() - lastPing < STALE_MS)
    }

    window.addEventListener('message', onMessage)
    const start = window.setTimeout(tick, lastPing ? 0 : FIRST_CHECK_MS)
    const interval = window.setInterval(tick, POLL_MS)

    return () => {
      window.removeEventListener('message', onMessage)
      window.clearTimeout(start)
      window.clearInterval(interval)
    }
  }, [])

  useLayoutEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const height = online === false ? bannerRef.current?.offsetHeight ?? 0 : 0
      root.style.setProperty('--hami-ext-banner-h', `${height}px`)
    }
    apply()
    window.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('resize', apply)
      root.style.setProperty('--hami-ext-banner-h', '0px')
    }
  }, [online])

  if (online !== false) return null

  const copies = Array.from({ length: 10 }, (_, i) => i)

  return (
    <div
      ref={bannerRef}
      className="hami-ext-banner"
      role="status"
      aria-live="polite"
    >
      <div className="hami-ext-banner-led" aria-hidden>
        <div className="hami-ext-led-track">
          {copies.map((i) => (
            <span key={`led-${i}`}>{MESSAGE}</span>
          ))}
        </div>
      </div>
      <div className="hami-ext-marquee">
        <div className="hami-ext-marquee-track">
          {copies.map((i) => (
            <span key={`pill-${i}`} className="hami-ext-pill">
              {LABEL}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
