'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export function ActivityTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname.startsWith('/login') || pathname.startsWith('/register')) return

    const key = 'mostem-last-activity'
    const now = Date.now()
    try {
      const prev = JSON.parse(sessionStorage.getItem(key) || 'null') as { path?: string; at?: number } | null
      if (prev?.path === pathname && now - (prev.at ?? 0) < 45_000) return
    } catch {
      // ignore
    }
    sessionStorage.setItem(key, JSON.stringify({ path: pathname, at: now }))

    void fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        screen: `${window.screen.width}x${window.screen.height}`,
        dpr: window.devicePixelRatio,
        platform: navigator.platform,
        touch: navigator.maxTouchPoints,
      }),
    }).catch(() => undefined)
  }, [pathname])

  return null
}
