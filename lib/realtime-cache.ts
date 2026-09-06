import {
  applyBrowserNaver,
  fetchBrowserNaver,
  limitKeywordsPayload,
  stabilizeKeywordsPayload,
  type KeywordsPayload,
} from '@/lib/keywords'

const STORAGE_KEY = 'mostem:realtime-v2'
let memory: KeywordsPayload | null = null
let warming = false

export function peekRealtimeCache(): KeywordsPayload | null {
  if (memory) return memory
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    memory = limitKeywordsPayload(JSON.parse(raw) as KeywordsPayload)
    return memory
  } catch {
    return null
  }
}

export function writeRealtimeCache(data: KeywordsPayload) {
  memory = limitKeywordsPayload(stabilizeKeywordsPayload(data, memory))
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
  } catch {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
    } catch {
      /* ignore quota */
    }
  }
}

export async function fetchRealtime(scope: 'fast' | 'full' | 'news' = 'full') {
  const query = scope === 'full' ? '' : `?scope=${scope}`
  const res = await fetch(`/api/keywords${query}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('realtime fetch failed')
  const data = (await res.json()) as KeywordsPayload
  if (scope === 'news' && memory) {
    writeRealtimeCache({ ...memory, news: data.news, now: data.now })
    return peekRealtimeCache() ?? data
  }
  writeRealtimeCache(stabilizeKeywordsPayload(data, memory))
  return peekRealtimeCache() ?? data
}

export function warmRealtimeCache() {
  if (typeof window === 'undefined' || warming) return
  warming = true
  void Promise.all([
    fetchBrowserNaver().then((local) => {
      if (!local) return
      writeRealtimeCache(applyBrowserNaver(peekRealtimeCache(), local))
    }),
    fetchRealtime('fast').then(() => fetchRealtime('full')),
  ])
    .catch(() => {})
    .finally(() => {
      warming = false
    })
}
