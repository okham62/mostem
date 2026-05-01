'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Upload,
  History,
  Link2,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import type { Session } from 'next-auth'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/upload', label: '새 업로드', icon: Upload },
  { href: '/history', label: '업로드 기록', icon: History },
  { href: '/accounts', label: '연결된 계정', icon: Link2 },
  { href: '/admin', label: '회원 관리', icon: Users, adminOnly: true },
]

interface SidebarProps {
  session: Session | null
}

export function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const isAdmin = session?.user?.role === 'admin'

  const filteredNav = navItems.filter(item => !item.adminOnly || isAdmin)

  return (
    <aside
      className={cn(
        'relative flex h-screen flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* 로고 */}
      <div className="flex h-16 items-center gap-2.5 border-b border-[var(--sidebar-border)] px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand">
          <Zap className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-base font-bold text-[var(--foreground)]">MOSTEM</span>
        )}
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        <ul className="space-y-0.5">
          {filteredNav.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand/10 text-brand dark:bg-brand/20'
                      : 'text-[var(--muted)] hover:bg-[var(--muted-bg)] hover:text-[var(--foreground)]'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* 사용자 정보 + 로그아웃 */}
      <div className="border-t border-[var(--sidebar-border)] p-2">
        {!collapsed && session?.user && (
          <div className="mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name ?? ''}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-medium text-white">
                {session.user.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--foreground)]">
                {session.user.name}
              </p>
              <p className="truncate text-[10px] text-[var(--muted)]">
                {session.user.email}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20',
            collapsed && 'justify-center'
          )}
          title={collapsed ? '로그아웃' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && '로그아웃'}
        </button>
      </div>

      {/* 접기 버튼 */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--sidebar-border)] bg-[var(--card-bg)] text-[var(--muted)] shadow-sm hover:text-[var(--foreground)]"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </aside>
  )
}
