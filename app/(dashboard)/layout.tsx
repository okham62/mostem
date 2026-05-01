import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { MobileHeader } from '@/components/layout/mobile-header'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) redirect('/login')
  if (session.user.status === 'pending') redirect('/register?status=pending')
  if (session.user.status === 'rejected') redirect('/register?status=rejected')

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      {/* 데스크탑 사이드바 */}
      <div className="hidden md:flex">
        <Sidebar session={session} />
      </div>

      {/* 모바일 상단 헤더 */}
      <MobileHeader />

      {/* 메인 컨텐츠 */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* 데스크탑 헤더 */}
        <header className="hidden md:flex h-16 shrink-0 items-center justify-end border-b border-[var(--card-border)] px-6">
          <ThemeToggle />
        </header>

        {/* 스크롤 영역 */}
        <div
          className="flex-1 overflow-y-auto scrollbar-thin"
          style={{
            paddingTop: 'calc(3.5rem + env(safe-area-inset-top))',
            paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
          }}
        >
          <div className="p-4 md:p-6">
            {children}
          </div>
        </div>
      </main>

      {/* 모바일 하단 탭바 */}
      <MobileNav session={session} />
    </div>
  )
}
