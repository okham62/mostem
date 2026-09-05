'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap } from 'lucide-react'
import type { Session } from 'next-auth'

const PAGE_TITLES: Record<string, string> = {
  '/keywords': '실시간 키워드',
  '/news': '실시간 뉴스',
  '/markets': '마켓 시세',
  '/trends': '트렌드 데이터',
  '/shopping': '쇼핑 베스트',
  '/products': '상품 보드',
  '/threads': '스레드',
  '/instagram': '인스타',
  '/tiktok': '틱톡',
  '/blog': '네이버 블로그',
  '/compose': '새 글 만들기',
  '/ai': 'AI 도구',
  '/links': '링크 변환',
  '/settings': '설정',
  '/admin': '회원 관리',
}

export function MobileHeader({ session }: { session: Session | null }) {
  const pathname = usePathname()
  const title =
    Object.entries(PAGE_TITLES)
      .filter(([path]) => pathname === path || pathname.startsWith(path + '/'))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'MOSTEM'
  const user = session?.user
  const loginId = user?.username || user?.email?.replace(/@mostem\.local$/, '') || ''

  return (
    <header
      className="fixed left-0 right-0 z-40 flex h-14 items-center justify-between px-4 md:hidden"
      style={{
        top: 'var(--hami-ext-banner-h, 0px)',
        background: 'var(--chrome-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--card-border)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand">
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-bold text-white">{title}</span>
      </div>
      {user ? (
        <Link href="/settings" className="flex items-center gap-2">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[11px] font-medium text-white">
              {user.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
          )}
          <span className="max-w-20 truncate text-[11px] text-white/70">{loginId}</span>
        </Link>
      ) : null}
    </header>
  )
}
