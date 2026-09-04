import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { MobileHeader } from '@/components/layout/mobile-header'
import { AppHeader } from '@/components/layout/app-header'
import { ActivityTracker } from '@/components/layout/activity-tracker'

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
    <div className="flex h-full overflow-hidden bg-[var(--background)]">
      <div className="hidden md:flex">
        <Sidebar session={session} />
      </div>

      <MobileHeader />

      <main className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        <div className="flex-1 overflow-y-auto scrollbar-thin pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] md:pt-0 md:pb-0">
          <div className="p-3 md:p-4">{children}</div>
        </div>
      </main>

      <MobileNav session={session} />
      <ActivityTracker />
    </div>
  )
}
