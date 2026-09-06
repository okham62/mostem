import type { TrendsPayload } from '@/lib/trends'

const STORAGE_KEY = 'mostem:trends-v2'
let memory: TrendsPayload | null = null
let warming = false
let inflight: Promise<TrendsPayload> | null = null

function slimPayload(data: TrendsPayload): TrendsPayload {
  return {
    now: data.now,
    latestDate: data.latestDate,
    categories: data.categories,
    stats: data.stats,
    items: data.items.slice(0, 120).map((item) => ({
      ...item,
      daily: [],
      spark: Array.isArray(item.spark) ? item.spark.slice(-10) : [],
    })),
  }
}

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
  if (memory && data.items.length + 8 < memory.items.length) return
  memory = data
  if (typeof window === 'undefined') return
  const slim = slimPayload(data)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
  } catch {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
    } catch {
      /* ignore quota */
    }
  }
}

export async function fetchTrends(fast = false) {
  if (inflight && !fast) return inflight
  const job = (async () => {
    const res = await fetch(fast ? '/api/trends?fast=1' : '/api/trends', { cache: 'no-store' })
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
  })()
  if (!fast) {
    inflight = job.finally(() => {
      inflight = null
    })
    return inflight
  }
  return job
}

export function warmTrendCache() {
  if (typeof window === 'undefined' || warming) return
  if (peekTrendCache()?.items.length && inflight) return
  warming = true
  void fetchTrends(true)
    .then((data) => {
      if (data?.items?.length) writeTrendCache(data)
      return fetchTrends(false)
    })
    .catch(() => {})
    .finally(() => {
      warming = false
    })
}
