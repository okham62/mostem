import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.status === 'pending') {
    redirect('/register?status=pending')
  }

  if (session.user.status === 'rejected') {
    redirect('/register?status=rejected')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar session={session} />
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-end border-b border-[var(--card-border)] px-6">
          <ThemeToggle />
        </header>
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </div>
      </main>
    </div>
  )
}
