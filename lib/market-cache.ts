import {
  fetchBrowserMarketCharts,
  mergeMarketCharts,
  type MarketChartsPayload,
} from '@/lib/market-charts'

const STORAGE_KEY = 'mostem:market-charts-v1'
let memory: MarketChartsPayload | null = null
let warming = false

export function peekMarketCharts(): MarketChartsPayload | null {
  if (memory) return memory
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    memory = JSON.parse(raw) as MarketChartsPayload
    return memory
  } catch {
    return null
  }
}

export function writeMarketCharts(data: MarketChartsPayload) {
  const merged = mergeMarketCharts(memory, data) ?? data
  memory = merged
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  } catch {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    } catch {
      /* ignore quota */
    }
  }
}

export async function fetchMarketCharts() {
  const res = await fetch('/api/markets/charts', { cache: 'no-store' })
  if (!res.ok) throw new Error('market charts fetch failed')
  const data = (await res.json()) as MarketChartsPayload
  const merged = mergeMarketCharts(peekMarketCharts(), data) ?? data
  if (merged.series && Object.keys(merged.series).length) writeMarketCharts(merged)
  return peekMarketCharts() ?? merged
}

export function warmMarketCharts() {
  if (typeof window === 'undefined' || warming) return
  warming = true
  void Promise.all([
    fetchBrowserMarketCharts().then((local) => {
      if (local) writeMarketCharts(local)
    }),
    fetchMarketCharts(),
  ])
    .catch(() => {})
    .finally(() => {
      warming = false
    })
}
