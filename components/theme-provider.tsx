'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  THEME_STORAGE_KEY,
  applyResolvedTheme,
  isThemeChoice,
  resolveTheme,
  type ThemeChoice,
} from '@/lib/theme'

const ThemeContext = createContext<{
  choice: ThemeChoice
  setChoice: (choice: ThemeChoice) => void
}>({
  choice: 'dark',
  setChoice: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>('dark')

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeChoice(stored)) setChoiceState(stored)
  }, [])

  useEffect(() => {
    applyResolvedTheme(resolveTheme(choice))
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (choice === 'auto') applyResolvedTheme(resolveTheme('auto'))
    }
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [choice])

  const value = useMemo(
    () => ({
      choice,
      setChoice: (next: ThemeChoice) => {
        localStorage.setItem(THEME_STORAGE_KEY, next)
        setChoiceState(next)
      },
    }),
    [choice]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
