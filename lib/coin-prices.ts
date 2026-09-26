export type CoinMarket = {
  symbol: string
  name: string
  market: string
}

export type CoinPriceMap = Record<string, { krw: number; change: number }>

type UpbitMarket = {
  market?: string
  korean_name?: string
  english_name?: string
}

type UpbitTicker = {
  market?: string
  trade_price?: number
  signed_change_rate?: number
}

let marketsCache: { at: number; rows: CoinMarket[] } | null = null
const pricesCache = new Map<string, { at: number; price: { krw: number; change: number } }>()

async function fetchJson<T>(url: string, timeout = 7000): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(timeout),
  })
  if (!res.ok) throw new Error(`시세를 불러오지 못했습니다. (${res.status})`)
  return res.json() as Promise<T>
}

export async function listKrwCoinMarkets(): Promise<CoinMarket[]> {
  if (marketsCache && Date.now() - marketsCache.at < 6 * 60 * 60_000) return marketsCache.rows
  const rows = await fetchJson<UpbitMarket[]>('https://api.upbit.com/v1/market/all?isDetails=false')
  const markets = rows
    .filter((row) => typeof row.market === 'string' && row.market.startsWith('KRW-'))
    .map((row) => ({
      symbol: row.market!.slice(4),
      name: row.korean_name || row.english_name || row.market!.slice(4),
      market: row.market!,
    }))
  marketsCache = { at: Date.now(), rows: markets }
  return markets
}

export function searchCoinMarkets(markets: CoinMarket[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return markets.slice(0, 12)
  return markets
    .filter(
      (item) =>
        item.symbol.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.market.toLowerCase().includes(q),
    )
    .slice(0, 12)
}

export async function fetchCoinPrices(symbols: string[]): Promise<CoinPriceMap> {
  const unique = [...new Set(symbols.map((item) => item.toUpperCase()).filter(Boolean))]
  if (!unique.length) return {}
  const now = Date.now()
  const fresh: CoinPriceMap = {}
  const missing: string[] = []
  for (const symbol of unique) {
    const hit = pricesCache.get(symbol)
    if (hit && now - hit.at < 15_000) fresh[symbol] = hit.price
    else missing.push(symbol)
  }
  if (!missing.length) return fresh
  const markets = missing.map((symbol) => `KRW-${symbol}`).join(',')
  try {
    const rows = await fetchJson<UpbitTicker[]>(`https://api.upbit.com/v1/ticker?markets=${markets}`)
    for (const row of rows) {
      const symbol = row.market?.startsWith('KRW-') ? row.market.slice(4) : ''
      const krw = Number(row.trade_price)
      if (!symbol || !Number.isFinite(krw)) continue
      const price = { krw, change: Number(row.signed_change_rate || 0) * 100 }
      pricesCache.set(symbol, { at: now, price })
      fresh[symbol] = price
    }
  } catch {
    /* keep whatever we already have */
  }
  return fresh
}
