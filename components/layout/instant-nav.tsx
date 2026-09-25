'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

type InstantNav = {
  activePath: string
  mark: (href: string) => void
}

const InstantNavContext = createContext<InstantNav>({
  activePath: '',
  mark: () => undefined,
})

export function pathOf(href: string) {
  return href.split('?')[0] || href
}

export function InstantNavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    setPending((cur) => (cur && (pathname === cur || pathname.startsWith(`${cur}/`)) ? null : cur))
  }, [pathname])

  useEffect(() => {
    if (!pending) return
    const timer = window.setTimeout(() => setPending(null), 4000)
    return () => window.clearTimeout(timer)
  }, [pending])

  const mark = useCallback((href: string) => {
    setPending(pathOf(href))
  }, [])

  const value = useMemo(
    () => ({
      activePath: pending ?? pathname,
      mark,
    }),
    [mark, pathname, pending],
  )

  return <InstantNavContext.Provider value={value}>{children}</InstantNavContext.Provider>
}

export function useInstantNav() {
  return useContext(InstantNavContext)
}

export function isNavActive(activePath: string, href: string) {
  const itemPath = pathOf(href)
  if (itemPath === '/admin') {
    return activePath === '/admin' || activePath.startsWith('/admin/users')
  }
  return activePath === itemPath || activePath.startsWith(`${itemPath}/`)
}
