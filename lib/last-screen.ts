const PATH_KEY = 'mostem-last-screen'
const COINS_KEY = 'mostem-coins-view'
const SCROLL_KEY = 'mostem-last-scroll'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

const ENTRY_PATHS = new Set(['/', '/keywords', '/dashboard'])
const BLOCKED = [/^\/login/, /^\/register/, /^\/api\//]

export type LastScreen = {
  path: string
  search?: string
  at: number
}

export type CoinsView = {
  personId: string
  openSymbol: string
}

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function readLastScreen(): LastScreen | null {
  const saved = readJson<LastScreen>(PATH_KEY)
  if (!saved?.path || Date.now() - saved.at > MAX_AGE_MS) return null
  return saved
}

export function writeLastScreen(path: string, search = '') {
  if (typeof window === 'undefined' || !isRestorablePath(path)) return
  window.localStorage.setItem(PATH_KEY, JSON.stringify({ path, search, at: Date.now() } satisfies LastScreen))
}

export function isEntryPath(path: string) {
  return ENTRY_PATHS.has(path)
}

export function isRestorablePath(path: string) {
  return Boolean(path) && path.startsWith('/') && !BLOCKED.some((rule) => rule.test(path))
}

export function readCoinsView(): CoinsView | null {
  const saved = readJson<CoinsView>(COINS_KEY)
  if (!saved?.personId) return null
  return saved
}

export function writeCoinsView(view: CoinsView) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(COINS_KEY, JSON.stringify(view))
}

export function readLastScroll(path: string) {
  const saved = readJson<Record<string, number>>(SCROLL_KEY) ?? {}
  return saved[path] ?? 0
}

export function writeLastScroll(path: string, top: number) {
  if (typeof window === 'undefined') return
  const saved = readJson<Record<string, number>>(SCROLL_KEY) ?? {}
  saved[path] = top
  window.localStorage.setItem(SCROLL_KEY, JSON.stringify(saved))
}
