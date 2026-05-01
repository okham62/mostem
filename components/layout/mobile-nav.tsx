'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Upload, History, Link2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Session } from 'next-auth'

const navItems = [
  { href: '/dashboard', label: '홈', icon: LayoutDashboard },
  { href: '/upload', label: '업로드', icon: Upload },
  { href: '/history', label: '기록', icon: History },
  { href: '/accounts', label: '계정', icon: Link2 },
]

export function MobileNav({ session }: { session: Session | null }) {
  const pathname = usePathname()
  const isAdmin = session?.user?.role === 'admin'

  const items = isAdmin
    ? [...navItems, { href: '/admin', label: '관리', icon: Users }]
    : navItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* 블러 배경 */}
      <div
        className="flex items-stretch border-t border-white/10"
        style={{
          background: 'rgba(10, 12, 20, 0.85)',
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
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-all duration-200',
                isActive
                  ? 'text-brand'
                  : 'text-white/40 hover:text-white/70'
              )}
            >
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200',
                isActive ? 'bg-brand/15 scale-110' : ''
              )}>
                <Icon className={cn('h-5 w-5', isActive ? 'stroke-[2.5px]' : 'stroke-2')} />
              </div>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
