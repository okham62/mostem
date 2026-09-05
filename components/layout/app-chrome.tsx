'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Session } from 'next-auth'
import { Sidebar } from '@/components/layout/sidebar'
import { SIDEBAR_STORAGE_KEY } from '@/lib/theme'
import { cn } from '@/lib/utils'

const SidebarChromeContext = createContext<{
  hidden: boolean
  toggle: () => void
}>({
  hidden: false,
  toggle: () => {},
})

export function useSidebarChrome() {
  return useContext(SidebarChromeContext)
}

export function AppChrome({
  session,
  children,
}: {
  session: Session | null
  children: React.ReactNode
}) {
  const [hidden, setHidden] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setHidden(localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1')
    setReady(true)
  }, [])

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  const value = useMemo(() => ({ hidden, toggle }), [hidden, toggle])

  return (
    <SidebarChromeContext.Provider value={value}>
      <div className="flex h-full overflow-hidden bg-background">
        <div
          data-ready={ready ? '1' : '0'}
          className={cn(
            'mostem-sidebar-rail hidden md:block',
            hidden && 'mostem-sidebar-rail-hidden'
          )}
        >
          <div className="mostem-sidebar-pane">
            <Sidebar session={session} onHide={toggle} />
          </div>
        </div>

        <button
          type="button"
          data-show={ready && hidden ? '1' : '0'}
          aria-label="사이드바 열기"
          onClick={toggle}
          className="mostem-sidebar-peek hidden md:flex"
        >
          <span className="mostem-sidebar-peek-glow" aria-hidden />
          <ChevronRight className="mostem-sidebar-peek-icon h-4 w-4" />
        </button>

        {children}
      </div>
    </SidebarChromeContext.Provider>
  )
}

