'use client'

import { PanelLeftOpen } from 'lucide-react'
import { useSidebarChrome } from '@/components/layout/app-chrome'

export function AppHeader() {
  const { hidden, toggle } = useSidebarChrome()

  if (!hidden) return null

  return (
    <header className="hidden h-12 shrink-0 items-center border-b border-[var(--card-border)] px-6 md:flex">
      <button
        type="button"
        aria-label="사이드바 열기"
        onClick={toggle}
        className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </button>
    </header>
  )
}
