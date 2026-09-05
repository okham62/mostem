'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useSidebarChrome } from '@/components/layout/app-chrome'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import type { ThemeChoice } from '@/lib/theme'

const THEMES: { id: ThemeChoice; label: string; hint: string; icon: typeof Sun }[] = [
  { id: 'light', label: '화이트톤', hint: '밝은 화면', icon: Sun },
  { id: 'dark', label: '어두운톤', hint: '어두운 화면', icon: Moon },
  { id: 'auto', label: '자동', hint: '기기 설정', icon: Monitor },
]

export function AppearanceSettings() {
  const { choice, setChoice } = useTheme()
  const { hidden, toggle } = useSidebarChrome()

  return (
    <section className="mx-auto w-full max-w-[520px] rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
      <div className="mb-4 text-center">
        <h2 className="text-base font-semibold text-white">화면 설정</h2>
        <p className="mt-1 text-xs text-white/40">원하는 톤과 사이드바 표시를 고를 수 있습니다.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {THEMES.map((item) => {
          const Icon = item.icon
          const active = choice === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setChoice(item.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition',
                active
                  ? 'border-gold/40 bg-gold/10 text-white'
                  : 'border-white/10 bg-black/20 text-white/55 hover:border-white/20 hover:text-white'
              )}
            >
              <Icon className={cn('h-4 w-4', active && 'text-gold')} />
              <span className="text-xs font-semibold">{item.label}</span>
              <span className="text-[10px] text-white/35">{item.hint}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-white">사이드바</p>
          <p className="text-[11px] text-white/40">왼쪽 메뉴를 숨기거나 다시 펼칩니다.</p>
        </div>
        <button
          type="button"
          onClick={toggle}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
            hidden ? 'bg-white/10 text-white' : 'bg-brand text-white'
          )}
        >
          {hidden ? '숨김' : '표시'}
        </button>
      </div>
    </section>
  )
}
