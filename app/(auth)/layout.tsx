import { ThemeToggle } from '@/components/layout/theme-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="absolute right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      {children}
    </div>
  )
}
