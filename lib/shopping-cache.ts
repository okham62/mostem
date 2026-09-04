import type { ShoppingPayload } from '@/lib/shopping'

const STORAGE_KEY = 'mostem:shopping-v1'
let memory: ShoppingPayload | null = null
let warming = false

export function peekShoppingCache(): ShoppingPayload | null {
  if (memory) return memory
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    memory = JSON.parse(raw) as ShoppingPayload
    return memory
  } catch {
    return null
  }
}

export function writeShoppingCache(data: ShoppingPayload) {
  memory = data
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore quota */
  }
}

export async function fetchShopping() {
  const res = await fetch('/api/shopping', { cache: 'no-store' })
  if (!res.ok) throw new Error('shopping fetch failed')
  const data = (await res.json()) as ShoppingPayload
  writeShoppingCache(data)
  return data
}

export function warmShoppingCache() {
  if (typeof window === 'undefined' || warming) return
  warming = true
  void fetchShopping()
    .catch(() => {})
    .finally(() => {
      warming = false
    })
}
