'use client'

import { usePathname } from 'next/navigation'
import { Zap } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/keywords': '실시간 키워드',
  '/trends': '트렌드 데이터',
  '/shopping': '쇼핑 베스트',
  '/products': '상품 보드',
  '/threads': '스레드',
  '/compose': '새 글 만들기',
  '/ai': 'AI 도구',
  '/calendar': '캘린더',
  '/links': '링크 변환',
  '/profit': '수익 실적',
  '/challenge': '챌린지·인증',
  '/ranking': '랭킹',
  '/settings': '설정',
  '/admin': '회원 관리',
}

export function MobileHeader() {
  const pathname = usePathname()
  const title =
    Object.entries(PAGE_TITLES)
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
      <span className="rounded-md bg-gold/15 px-2 py-1 text-[10px] font-bold text-gold">0 크레딧</span>
    </header>
  )
}
