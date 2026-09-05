'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  Flame,
  Newspaper,
  TrendingUp,
  ShoppingBag,
  LineChart,
  Link2,
  Users,
  LogOut,
  PanelLeftClose,
  Sparkles,
} from 'lucide-react'
import { BrandMark } from '@/components/brand-logos'
import { cn } from '@/lib/utils'
import { warmMarketCharts } from '@/lib/market-cache'
import { warmRealtimeCache } from '@/lib/realtime-cache'
import { warmShoppingCache } from '@/lib/shopping-cache'
import { previewHideMarketTicker } from '@/components/layout/market-ticker'
import type { Session } from 'next-auth'

export const explore = [
  { href: '/keywords', label: '실시간 키워드', icon: Flame },
  { href: '/news', label: '실시간 뉴스', icon: Newspaper },
  { href: '/markets', label: '마켓 시세', icon: LineChart },
  { href: '/trends', label: '트렌드 데이터', icon: TrendingUp },
  { href: '/shopping', label: '쇼핑 베스트', icon: ShoppingBag },
]

function ThreadsIcon() {
  return <BrandMark id="threads" className="h-5 w-5" />
}
function InstagramIcon() {
  return <BrandMark id="instagram" className="h-5 w-5" />
}
function TiktokIcon() {
  return <BrandMark id="tiktok" className="h-5 w-5" />
}
function BlogIcon() {
  return <BrandMark id="blog" className="h-5 w-5" />
}

export const publish = [
  { href: '/threads', label: '스레드', icon: ThreadsIcon },
  { href: '/instagram', label: '인스타', icon: InstagramIcon },
  { href: '/tiktok', label: '틱톡', icon: TiktokIcon },
  { href: '/blog', label: '네이버 블로그', icon: BlogIcon },
]

export const tools = [
  { href: '/ai', label: 'AI 도구', icon: Sparkles },
  { href: '/links', label: '링크 변환', icon: Link2 },
]

interface SidebarProps {
  session: Session | null
  onHide?: () => void
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
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2 px-3">
        <span className="h-3.5 w-[3px] shrink-0 rounded-full bg-gold" />
        <p className="text-[13px] font-extrabold tracking-tight text-white">{title}</p>
        <span className="h-px min-w-4 flex-1 bg-white/12" />
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => {
                  previewHideMarketTicker(item.href === '/markets')
                }}
                onMouseEnter={() => {
                  if (item.href === '/keywords' || item.href === '/news') warmRealtimeCache()
                  if (item.href === '/shopping') warmShoppingCache()
                  if (item.href === '/markets') warmMarketCharts()
                }}
                onFocus={() => {
                  if (item.href === '/keywords' || item.href === '/news') warmRealtimeCache()
                  if (item.href === '/shopping') warmShoppingCache()
                  if (item.href === '/markets') warmMarketCharts()
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

export function Sidebar({ session, onHide }: SidebarProps) {
  const pathname = usePathname()
  const { data: liveSession } = useSession()
  const user = liveSession?.user ?? session?.user
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    const id = window.setTimeout(() => {
      warmRealtimeCache()
      warmMarketCharts()
    }, 300)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <aside className="flex h-full w-60 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]">
      <div className="flex items-center justify-end px-2 pt-2">
        <button
          type="button"
          aria-label="사이드바 숨기기"
          onClick={onHide}
          className="rounded-lg p-1.5 text-white/35 transition-colors hover:bg-white/8 hover:text-white"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pt-1 scrollbar-thin">
        <NavGroup title="탐색" items={explore} pathname={pathname} />
        <NavGroup title="발행" items={publish} pathname={pathname} />
        <NavGroup title="도구" items={tools} pathname={pathname} />
        {isAdmin && (
          <NavGroup
            title="관리"
            items={[{ href: '/admin', label: '회원 관리', icon: Users }]}
            pathname={pathname}
          />
        )}
      </nav>

      <div className="border-t border-[var(--sidebar-border)] p-2">
        {user && (
          <Link
            href="/settings"
            className={cn(
              'mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2',
              pathname.startsWith('/settings')
                ? 'bg-brand/20'
                : 'hover:bg-white/5'
            )}
          >
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-medium text-white">
                {user.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{user.name}</p>
              <p className="truncate text-[10px] text-white/40">
                {user.username || user.email?.replace(/@mostem\.local$/, '')}
              </p>
            </div>
          </Link>
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
