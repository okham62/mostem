'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Flame,
  Newspaper,
  TrendingUp,
  ShoppingBag,
  LayoutGrid,
  MessageSquare,
  Link2,
  Settings,
  Users,
  LogOut,
  Zap,
  Tags,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { warmRealtimeCache } from '@/lib/realtime-cache'
import { warmShoppingCache } from '@/lib/shopping-cache'
import type { Session } from 'next-auth'

const explore = [
  { href: '/keywords', label: '실시간 키워드', icon: Flame },
  { href: '/news', label: '실시간 뉴스', icon: Newspaper },
  { href: '/trends', label: '트렌드 데이터', icon: TrendingUp },
  { href: '/shopping', label: '쇼핑 베스트', icon: ShoppingBag },
  { href: '/products', label: '상품 보드', icon: LayoutGrid },
]

const publish = [
  { href: '/threads', label: '스레드', icon: MessageSquare },
  { href: '/ai', label: 'AI 태그 생성기', icon: Tags },
  { href: '/links', label: '링크 변환', icon: Link2 },
]

interface SidebarProps {
  session: Session | null
}

function NavGroup({
  title,
  items,
  pathname,
}: {
  title: string
  items: { href: string; label: string; icon: React.ElementType }[]
  pathname: string
}) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onMouseEnter={() => {
                  if (item.href === '/keywords' || item.href === '/news') warmRealtimeCache()
                  if (item.href === '/shopping') warmShoppingCache()
                }}
                onFocus={() => {
                  if (item.href === '/keywords' || item.href === '/news') warmRealtimeCache()
                  if (item.href === '/shopping') warmShoppingCache()
                }}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand/20 text-brand'
                    : 'text-white/50 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = session?.user?.role === 'admin'

  useEffect(() => {
    const id = window.setTimeout(() => warmRealtimeCache(), 300)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <aside className="flex h-full w-60 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]">
      <div className="flex h-16 items-center gap-2.5 border-b border-[var(--sidebar-border)] px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold text-white">MOSTEM</span>
      </div>

      <div className="p-3">
        <Link
          href="/compose"
          className="flex w-full items-center justify-center rounded-xl bg-gold py-2.5 text-sm font-bold text-black transition hover:bg-gold-hover"
        >
          새 글 만들기
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 scrollbar-thin">
        <NavGroup title="탐색" items={explore} pathname={pathname} />
        <NavGroup title="발행" items={publish} pathname={pathname} />
        {isAdmin && (
          <NavGroup
            title="관리"
            items={[{ href: '/admin', label: '회원 관리', icon: Users }]}
            pathname={pathname}
          />
        )}
      </nav>

      <div className="border-t border-[var(--sidebar-border)] p-2">
        <Link
          href="/settings"
          className={cn(
            'mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
            pathname.startsWith('/settings')
              ? 'bg-brand/20 text-brand'
              : 'text-white/50 hover:bg-white/5 hover:text-white'
          )}
        >
          <Settings className="h-4 w-4" />
          설정
        </Link>
        {session?.user && (
          <div className="mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-medium text-white">
              {session.user.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{session.user.name}</p>
              <p className="truncate text-[10px] text-white/40">Free</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/40 transition-colors hover:bg-red-900/20 hover:text-red-400"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
