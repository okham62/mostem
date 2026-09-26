'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import {
  isEntryPath,
  isRestorablePath,
  readLastScreen,
  readLastScroll,
  writeLastScreen,
  writeLastScroll,
} from '@/lib/last-screen'

export function LastScreenTracker() {
  const pathname = usePathname()
  const router = useRouter()
  const restoring = useRef(false)

  useEffect(() => {
    const last = readLastScreen()
    const path = window.location.pathname
    if (!last || !isEntryPath(path) || last.path === path || !isRestorablePath(last.path)) return
    restoring.current = true
    router.replace(`${last.path}${last.search || ''}`)
  }, [router])

  useEffect(() => {
    if (!pathname) return
    if (restoring.current) {
      const last = readLastScreen()
      if (last && pathname !== last.path) return
      restoring.current = false
    }
    writeLastScreen(pathname, window.location.search)
  }, [pathname])

  useEffect(() => {
    const scroller = document.getElementById('mostem-scroll')
    if (!scroller || !pathname) return
    const top = readLastScroll(pathname)
    if (top > 0) scroller.scrollTop = top
    let frame = 0
    const onScroll = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => writeLastScroll(pathname, scroller.scrollTop))
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', onScroll)
    }
  }, [pathname])

  return null
}
