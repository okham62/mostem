'use client'

import { usePathname } from 'next/navigation'
import { Zap } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '대시보드',
  '/upload': '새 업로드',
  '/history': '업로드 기록',
  '/accounts': '연결된 계정',
  '/admin': '회원 관리',
}

export function MobileHeader() {
  const pathname = usePathname()

  // 가장 긴 매칭 찾기
  const title = Object.entries(PAGE_TITLES)
    .filter(([path]) => pathname === path || pathname.startsWith(path + '/'))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'MOSTEM'

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between px-4 md:hidden"
      style={{
        background: 'rgba(10, 12, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand">
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-bold text-white">{title}</span>
      </div>
      <ThemeToggle />
    </header>
  )
}
