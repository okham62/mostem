'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Flame,
  LineChart,
  LogOut,
  MoreHorizontal,
  Newspaper,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { warmMarketCharts } from '@/lib/market-cache'
import { warmRealtimeCache } from '@/lib/realtime-cache'
import { warmShoppingCache } from '@/lib/shopping-cache'
import { previewHideMarketTicker } from '@/components/layout/market-ticker'
import { explore, publish, tools } from '@/components/layout/sidebar'
import type { Session } from 'next-auth'

const PRIMARY = [
  { href: '/keywords', label: '키워드', icon: Flame },
  { href: '/news', label: '뉴스', icon: Newspaper },
  { href: '/markets', label: '마켓', icon: LineChart },
  { href: '/ai', label: 'AI', icon: Sparkles },
] as const

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

function warmPath(href: string) {
  if (href === '/keywords' || href === '/news') warmRealtimeCache()
  if (href === '/shopping') warmShoppingCache()
  if (href === '/markets') warmMarketCharts()
}

export function MobileNav({ session }: { session: Session | null }) {
  const pathname = usePathname()
  const isAdmin = session?.user?.role === 'admin'
  const [moreOpen, setMoreOpen] = useState(false)
  const primaryActive = PRIMARY.some((item) => isActivePath(pathname, item.href))

  useEffect(() => {
    const id = window.setTimeout(() => {
      warmRealtimeCache()
      warmMarketCharts()
    }, 300)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!moreOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  const groups = [
    { title: '탐색', items: explore },
    { title: '발행', items: publish },
    { title: '도구', items: tools },
    ...(isAdmin
      ? [{ title: '관리', items: [{ href: '/admin', label: '회원 관리', icon: Users }] }]
      : []),
  ]

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label="메뉴 닫기"
            className="absolute inset-0 bg-black/55"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[min(88dvh,640px)] overflow-y-auto rounded-t-3xl border-t border-white/10"
            style={{
              background: 'var(--sidebar-bg)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 px-4 py-3"
              style={{ background: 'var(--sidebar-bg)' }}
            >
              <p className="text-sm font-extrabold text-white">전체 메뉴</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/50"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-3 py-3">
              {groups.map((group) => (
                <div key={group.title} className="mb-5">
                  <div className="mb-2 flex items-center gap-2 px-3">
                    <span className="h-3.5 w-[3px] shrink-0 rounded-full bg-gold" />
                    <p className="text-[13px] font-extrabold text-white">{group.title}</p>
                    <span className="h-px min-w-4 flex-1 bg-white/12" />
                  </div>
                  <ul className="grid grid-cols-2 gap-1.5">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const active = isActivePath(pathname, item.href)
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => {
                              previewHideMarketTicker(item.href === '/markets')
                              warmPath(item.href)
                            }}
                            className={cn(
                              'flex min-h-12 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium',
                              active ? 'bg-brand/20 text-brand' : 'bg-white/4 text-white/70'
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
              <Link
                href="/settings"
                className={cn(
                  'mb-2 flex min-h-12 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium',
                  isActivePath(pathname, '/settings') ? 'bg-brand/20 text-brand' : 'bg-white/4 text-white/70'
                )}
              >
                <Settings className="h-4 w-4" />
                설정
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex min-h-12 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-300/80"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div
          className="flex items-stretch border-t border-white/10"
          style={{
            background: 'var(--chrome-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {PRIMARY.map((item) => {
            const Icon = item.icon
            const active = isActivePath(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onTouchStart={() => warmPath(item.href)}
                onClick={() => previewHideMarketTicker(item.href === '/markets')}
                className={cn(
                  'flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold',
                  active ? 'text-brand' : 'text-white/40'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl',
                    active && 'bg-brand/15'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span>{item.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold',
              !primaryActive || moreOpen ? 'text-brand' : 'text-white/40'
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl',
                (!primaryActive || moreOpen) && 'bg-brand/15'
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
            </div>
            <span>더보기</span>
          </button>
        </div>
      </nav>
    </>
  )
}
