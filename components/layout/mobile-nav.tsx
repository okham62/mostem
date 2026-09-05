'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Flame, MessageSquare, Sparkles, Newspaper, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { warmRealtimeCache } from '@/lib/realtime-cache'
import type { Session } from 'next-auth'

const navItems = [
  { href: '/keywords', label: '키워드', icon: Flame },
  { href: '/news', label: '뉴스', icon: Newspaper },
  { href: '/threads', label: '스레드', icon: MessageSquare },
  { href: '/ai', label: 'AI', icon: Sparkles },
]

export function MobileNav({ session }: { session: Session | null }) {
  const pathname = usePathname()
  const isAdmin = session?.user?.role === 'admin'
  const items = isAdmin
    ? [...navItems, { href: '/admin', label: '관리', icon: Users }]
    : navItems

  useEffect(() => {
    const id = window.setTimeout(() => warmRealtimeCache(), 300)
    return () => window.clearTimeout(id)
  }, [])

  return (
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
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onTouchStart={() => {
                if (item.href === '/keywords' || item.href === '/news') warmRealtimeCache()
              }}
              onMouseEnter={() => {
                if (item.href === '/keywords' || item.href === '/news') warmRealtimeCache()
              }}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium',
                isActive ? 'text-brand' : 'text-white/40'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl',
                  isActive && 'bg-brand/15'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
