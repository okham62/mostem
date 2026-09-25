'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const PING_SOURCE = 'hami-extension'
const STALE_MS = 3500
const FIRST_CHECK_MS = 800
const POLL_MS = 400
const MESSAGE = '확장이 꺼져있어요. chrome://extensions에서 hami를 다시 켜주세요'
const LABEL = `[ ${MESSAGE} ]`
const HIDDEN_PREFIXES = ['/u/', '/login', '/register', '/go/']

function isHamiPing(data: unknown): data is { source: string; type: string; at?: number } {
  if (!data || typeof data !== 'object') return false
  const value = data as { source?: unknown; type?: unknown }
  return value.source === PING_SOURCE && value.type === 'ping'
}

export function ExtensionStatusBanner() {
  const pathname = usePathname() || ''
  const hiddenByRoute = HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))
  const [online, setOnline] = useState<boolean | null>(null)
  const [mobile, setMobile] = useState(true)
  const bannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (hiddenByRoute || mobile) return

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
  }, [hiddenByRoute, mobile])

  useLayoutEffect(() => {
    const root = document.documentElement
    const show = !hiddenByRoute && !mobile && online === false
    const apply = () => {
      const height = show ? bannerRef.current?.offsetHeight ?? 0 : 0
      root.style.setProperty('--hami-ext-banner-h', `${height}px`)
    }
    apply()
    window.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('resize', apply)
      root.style.setProperty('--hami-ext-banner-h', '0px')
    }
  }, [hiddenByRoute, mobile, online])

  if (hiddenByRoute || mobile || online !== false) return null

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
