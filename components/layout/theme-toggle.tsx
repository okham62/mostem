'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { resolveTheme, type ResolvedTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export function ThemeToggle({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md'
}) {
  const { choice, setChoice } = useTheme()
  const [resolved, setResolved] = useState<ResolvedTheme>('dark')

  useEffect(() => {
    setResolved(resolveTheme(choice))
  }, [choice])

  const isDark = resolved === 'dark'

  function toggle() {
    setChoice(isDark ? 'light' : 'dark')
  }

  const dim = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? '주간 모드' : '야간 모드'}
      title={isDark ? '주간 모드' : '야간 모드'}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/70 transition hover:border-white/30 hover:bg-white/10 hover:text-white',
        dim,
        className,
      )}
    >
      {isDark ? <Sun className={icon} strokeWidth={1.75} /> : <Moon className={icon} strokeWidth={1.75} />}
    </button>
  )
}
