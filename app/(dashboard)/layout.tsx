import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { AppChrome } from '@/components/layout/app-chrome'
import { MobileNav } from '@/components/layout/mobile-nav'
import { MobileHeader } from '@/components/layout/mobile-header'
import { MarketTicker } from '@/components/layout/market-ticker'
import { ActivityTracker } from '@/components/layout/activity-tracker'
import { AppSessionProvider } from '@/components/session-provider'

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
    <AppSessionProvider session={session}>
    <AppChrome session={session}>
      <MobileHeader session={session} />

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="hidden md:block">
          <MarketTicker />
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pt-0 md:pb-0">
          <div className="sticky top-0 z-20 md:hidden">
            <MarketTicker />
          </div>
          <div className="p-3 md:p-4">{children}</div>
        </div>
      </main>

      <MobileNav session={session} />
      <ActivityTracker />
    </AppChrome>
    </AppSessionProvider>
  )
}
