'use client'

import { Monitor, Moon, PanelLeft, Sun } from 'lucide-react'
import { useSidebarChrome } from '@/components/layout/app-chrome'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import type { ThemeChoice } from '@/lib/theme'

const THEMES: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: '화이트톤', icon: Sun },
  { id: 'dark', label: '어두운톤', icon: Moon },
  { id: 'auto', label: '자동', icon: Monitor },
]

export function AppearanceSettings({ className }: { className?: string }) {
  const { choice, setChoice } = useTheme()
  const { hidden, toggle } = useSidebarChrome()

  return (
    <div
      className={cn(
        'inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-1',
        className
      )}
    >
      <div
        className="flex items-center gap-0.5"
        role="group"
        aria-label="화면 톤"
      >
        {THEMES.map((item) => {
          const Icon = item.icon
          const active = choice === item.id
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              aria-label={item.label}
              aria-pressed={active}
              onClick={() => setChoice(item.id)}
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-md transition',
                active
                  ? 'bg-gold/15 text-gold'
                  : 'text-white/45 hover:bg-white/5 hover:text-white/80'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          )
        })}
      </div>

      <span className="mx-0.5 hidden h-4 w-px bg-white/10 sm:block" aria-hidden />

      <button
        type="button"
        onClick={toggle}
        title={hidden ? '사이드바 표시' : '사이드바 숨김'}
        aria-label={hidden ? '사이드바 표시' : '사이드바 숨김'}
        aria-pressed={!hidden}
        className={cn(
          'inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition',
          hidden
            ? 'text-white/45 hover:bg-white/5 hover:text-white/80'
            : 'bg-brand/20 text-white/85 hover:bg-brand/30'
        )}
      >
        <PanelLeft className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{hidden ? '펼치기' : '숨기기'}</span>
      </button>
    </div>
  )
}
