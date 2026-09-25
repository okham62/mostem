'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  BookOpen,
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
import { warmTrendCache } from '@/lib/trend-cache'
import { previewHideMarketTicker } from '@/components/layout/market-ticker'
import { isNavActive, pathOf, useInstantNav } from '@/components/layout/instant-nav'
import type { Session } from 'next-auth'

export const explore = [
  { href: '/keywords', label: '실시간 키워드', icon: Flame },
  { href: '/news', label: '실시간 뉴스', icon: Newspaper },
  { href: '/markets', label: '마켓 시세', icon: LineChart },
  { href: '/trends', label: '트렌드 데이터', icon: TrendingUp },
  { href: '/shopping', label: '쇼핑 베스트', icon: ShoppingBag },
]

function ThreadsIcon() {
  return <BrandMark id="threads" className="h-6 w-6" />
}
function InstagramIcon() {
  return <BrandMark id="instagram" className="h-6 w-6" />
}
function TiktokIcon() {
  return <BrandMark id="tiktok" className="h-6 w-6" />
}
function BlogIcon() {
  return <BrandMark id="blog" className="h-6 w-6" />
}

export const publish = [
  { href: '/threads?status=collected', label: 'Threads', icon: ThreadsIcon },
  { href: '/instagram?status=collected', label: 'Instagram', icon: InstagramIcon },
  { href: '/tiktok?status=collected', label: 'TikTok', icon: TiktokIcon },
  { href: '/blog', label: 'Blog', icon: BlogIcon },
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
}: {
  title: string
  items: { href: string; label: string; icon: React.ElementType }[]
}) {
  const router = useRouter()
  const { activePath, mark } = useInstantNav()
  return (
    <div className="mostem-sidebar-group">
      <div className="mostem-sidebar-group-head mb-2 flex items-center gap-2 px-3">
        <span className="h-3.5 w-[3px] shrink-0 rounded-full bg-gold" />
        <p className="text-sm font-extrabold tracking-tight text-white">{title}</p>
        <span className="h-px min-w-4 flex-1 bg-white/12" />
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon
          const itemPath = pathOf(item.href)
          const isActive = isNavActive(activePath, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch
                title={item.label}
                onClick={() => {
                  mark(item.href)
                  previewHideMarketTicker(itemPath === '/markets')
                  if (itemPath === '/keywords' || itemPath === '/news') warmRealtimeCache()
                  if (itemPath === '/shopping') warmShoppingCache()
                  if (itemPath === '/markets') warmMarketCharts()
                  if (itemPath === '/trends') warmTrendCache()
                  if (itemPath === '/links') void fetch('/api/links', { cache: 'no-store' })
                }}
                onMouseEnter={() => {
                  router.prefetch(item.href)
                  if (itemPath === '/keywords' || itemPath === '/news') warmRealtimeCache()
                  if (itemPath === '/shopping') warmShoppingCache()
                  if (itemPath === '/markets') warmMarketCharts()
                  if (itemPath === '/trends') warmTrendCache()
                  if (itemPath === '/links') void fetch('/api/links', { cache: 'no-store' })
                }}
                onFocus={() => {
                  router.prefetch(item.href)
                  if (itemPath === '/keywords' || itemPath === '/news') warmRealtimeCache()
                  if (itemPath === '/shopping') warmShoppingCache()
                  if (itemPath === '/markets') warmMarketCharts()
                  if (itemPath === '/trends') warmTrendCache()
                  if (itemPath === '/links') void fetch('/api/links', { cache: 'no-store' })
                }}
                className={cn(
                  'mostem-sidebar-link flex items-center rounded-lg py-2 text-[15px] font-semibold transition-colors',
                  isActive
                    ? 'bg-brand/20 text-brand'
                    : 'text-white hover:bg-white/10'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="mostem-sidebar-label">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Sidebar({ session, onHide }: SidebarProps) {
  const { activePath, mark } = useInstantNav()
  const { data: liveSession } = useSession()
  const user = liveSession?.user ?? session?.user
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    const idle = (cb: () => void) =>
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(cb, { timeout: 2500 })
        : window.setTimeout(cb, 1600)
    const id = idle(() => {
      warmRealtimeCache()
      warmMarketCharts()
      warmTrendCache()
    })
    return () => {
      if (typeof id === 'number') window.clearTimeout(id)
      else window.cancelIdleCallback?.(id)
    }
  }, [])

  return (
    <aside className="flex h-full w-full flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]">
      <div className="mostem-sidebar-toolbar flex items-center justify-end gap-2 px-2 pt-2">
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
        <NavGroup title="탐색" items={explore} />
        <NavGroup title="발행" items={publish} />
        <NavGroup title="도구" items={tools} />
        {isAdmin && (
          <NavGroup
            title="관리"
            items={[
              { href: '/admin', label: '회원 관리', icon: Users },
              { href: '/admin/guides', label: 'AI 지침서', icon: BookOpen },
            ]}
          />
        )}
      </nav>

      <div className="border-t border-[var(--sidebar-border)] p-2">
        {user && (
          <Link
            href="/settings"
            prefetch
            onClick={() => mark('/settings')}
            className={cn(
              'mostem-sidebar-user mb-1 flex items-center rounded-lg py-2',
              isNavActive(activePath, '/settings')
                ? 'bg-brand/20'
                : 'hover:bg-white/5'
            )}
          >
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-medium text-white">
                {user.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
            <div className="mostem-sidebar-user-meta min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{user.name}</p>
              <p className="truncate text-[10px] text-white/40">
                {user.username || user.email?.replace(/@mostem\.local$/, '')}
              </p>
            </div>
          </Link>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="mostem-sidebar-signout flex w-full items-center rounded-lg py-2.5 text-sm font-medium text-white/40 transition-colors hover:bg-red-900/20 hover:text-red-400"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="mostem-sidebar-label">로그아웃</span>
        </button>
      </div>
    </aside>
  )
}
