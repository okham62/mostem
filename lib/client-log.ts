'use client'

export function logWork(action: string, detail: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  void fetch('/api/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      detail,
      path: window.location.pathname,
      screen: `${window.screen.width}x${window.screen.height}`,
      dpr: window.devicePixelRatio,
      platform: navigator.platform,
      touch: navigator.maxTouchPoints,
    }),
  }).catch(() => undefined)
}
