'use client'

import { usePathname } from 'next/navigation'
import { Bell, BookOpen, Monitor, Moon, PanelLeftOpen, Search, Sun } from 'lucide-react'
import { useSidebarChrome } from '@/components/layout/app-chrome'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import type { ThemeChoice } from '@/lib/theme'

const TITLES: Record<string, string> = {
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

const THEME_BUTTONS: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: '화이트톤', icon: Sun },
  { id: 'dark', label: '어두운톤', icon: Moon },
  { id: 'auto', label: '자동', icon: Monitor },
]

export function AppHeader() {
  const pathname = usePathname()
  const { hidden, toggle } = useSidebarChrome()
  const { choice, setChoice } = useTheme()
  const title =
    Object.entries(TITLES)
      .filter(([path]) => pathname === path || pathname.startsWith(path + '/'))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'MOSTEM'

  return (
    <header className="hidden h-16 shrink-0 items-center justify-between border-b border-[var(--card-border)] px-6 md:flex">
      <div className="flex items-center gap-2">
        {hidden ? (
          <button
            type="button"
            aria-label="사이드바 열기"
            onClick={toggle}
            className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : null}
        <h1 className="text-sm font-semibold text-white/80">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5">
          {THEME_BUTTONS.map((item) => {
            const Icon = item.icon
            const active = choice === item.id
            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                aria-label={item.label}
                onClick={() => setChoice(item.id)}
                className={cn(
                  'rounded-md p-1.5 transition',
                  active ? 'bg-white/12 text-white' : 'text-white/40 hover:text-white'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            )
          })}
        </div>
        <button className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white">
          <Search className="h-4 w-4" />
        </button>
        <button className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white">
          <Bell className="h-4 w-4" />
        </button>
        <button className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
          <BookOpen className="h-3.5 w-3.5" />
          1초만에 시작하기
        </button>
      </div>
    </header>
  )
}
