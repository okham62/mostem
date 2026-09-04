import { ThemeToggle } from '@/components/layout/theme-toggle'
import Fluid from '@/components/ui/fluid'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-full min-h-0 items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <Fluid />
      </div>
      <div className="absolute right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      <div className="relative z-10 flex h-full w-full items-center justify-center pointer-events-none">
        {children}
      </div>
    </div>
  )
}
