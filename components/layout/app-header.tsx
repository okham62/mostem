'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search, BookOpen } from 'lucide-react'

const TITLES: Record<string, string> = {
  '/keywords': '실시간 키워드',
  '/news': '실시간 뉴스',
  '/trends': '트렌드 데이터',
  '/shopping': '쇼핑 베스트',
  '/products': '상품 보드',
  '/threads': '스레드',
  '/instagram': '인스타',
  '/tiktok': '틱톡',
  '/blog': '네이버 블로그',
  '/compose': '새 글 만들기',
  '/ai': 'AI 태그 생성기',
  '/links': '링크 변환',
  '/settings': '설정',
  '/admin': '회원 관리',
}

export function AppHeader() {
  const pathname = usePathname()
  const title =
    Object.entries(TITLES)
      .filter(([path]) => pathname === path || pathname.startsWith(path + '/'))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'MOSTEM'

  return (
    <header className="hidden h-16 shrink-0 items-center justify-between border-b border-[var(--card-border)] px-6 md:flex">
      <h1 className="text-sm font-semibold text-white/80">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white">
          <Search className="h-4 w-4" />
        </button>
        <button className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white">
          <Bell className="h-4 w-4" />
        </button>
        <div className="rounded-lg bg-gold/15 px-3 py-1.5 text-xs font-bold text-gold">
          0 크레딧
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
          <BookOpen className="h-3.5 w-3.5" />
          1초만에 시작하기
        </button>
      </div>
    </header>
  )
}
