import type { TrendsPayload } from '@/lib/trends'

const STORAGE_KEY = 'mostem:trends-v1'
let memory: TrendsPayload | null = null
let warming = false
let inflight: Promise<TrendsPayload> | null = null

function readStored(): TrendsPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as TrendsPayload
    if (!Array.isArray(data?.items) || !data.items.length) return null
    return data
  } catch {
    return null
  }
}

export function peekTrendCache(): TrendsPayload | null {
  if (memory?.items?.length) return memory
  const stored = readStored()
  if (stored) memory = stored
  return memory
}

export function writeTrendCache(data: TrendsPayload) {
  if (!data?.items?.length) return
  memory = data
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* ignore quota */
    }
  }
}

export async function fetchTrends() {
  if (inflight) return inflight
  inflight = (async () => {
    const res = await fetch('/api/trends', { cache: 'no-store' })
    if (!res.ok) {
      const prev = peekTrendCache()
      if (prev) return prev
      throw new Error('trends fetch failed')
    }
    const data = (await res.json()) as TrendsPayload
    if (!data?.items?.length) {
      const prev = peekTrendCache()
      if (prev) return prev
      throw new Error('trends empty')
    }
    writeTrendCache(data)
    return data
  })().finally(() => {
    inflight = null
  })
  return inflight
}

export function warmTrendCache() {
  if (typeof window === 'undefined' || warming) return
  warming = true
  void fetchTrends()
    .catch(() => {})
    .finally(() => {
      warming = false
    })
}
