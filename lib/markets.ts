export type MarketId = 'usd' | 'cny' | 'btc' | 'eth' | 'xrp' | 'sol'

export type MarketItem = {
  id: MarketId
  label: string
  image: string
  krw: number | null
  usd: number | null
  change: number | null
  kind: 'fx' | 'coin'
}

export type MarketsPayload = {
  now: number
  items: MarketItem[]
}

const FRESH_MS = 15_000
const STALE_MS = 5 * 60_000

let cache: { at: number; data: MarketsPayload } | null = null
let inflight: Promise<MarketsPayload> | null = null

const ICONS: Record<MarketId, string> = {
  usd: '/markets/usd.png',
  cny: '/markets/cny.png',
  btc: '/markets/btc.png',
  eth: '/markets/eth.png',
  xrp: '/markets/xrp.png',
  sol: '/markets/sol.png',
}

function num(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

async function fetchJson(url: string, timeout = 8000) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(timeout),
  })
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  return res.json()
}

function emptyItems(): MarketItem[] {
  return [
    { id: 'usd', label: '원달러', image: ICONS.usd, krw: null, usd: 1, change: null, kind: 'fx' },
    { id: 'cny', label: '중국환율', image: ICONS.cny, krw: null, usd: null, change: null, kind: 'fx' },
    { id: 'btc', label: '비트코인', image: ICONS.btc, krw: null, usd: null, change: null, kind: 'coin' },
    { id: 'eth', label: '이더리움', image: ICONS.eth, krw: null, usd: null, change: null, kind: 'coin' },
    { id: 'xrp', label: '리플', image: ICONS.xrp, krw: null, usd: null, change: null, kind: 'coin' },
    { id: 'sol', label: '솔라나', image: ICONS.sol, krw: null, usd: null, change: null, kind: 'coin' },
  ]
}

async function refreshMarkets(): Promise<MarketsPayload> {
  const items = emptyItems()
  const [fxRes, upbitRes, binanceRes] = await Promise.allSettled([
    fetchJson('https://open.er-api.com/v6/latest/USD'),
    fetchJson('https://api.upbit.com/v1/ticker?markets=KRW-BTC,KRW-ETH,KRW-XRP,KRW-SOL'),
    fetchJson('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","XRPUSDT","SOLUSDT"]'),
  ])

  let usdKrw: number | null = null
  if (fxRes.status === 'fulfilled') {
    const rates = (fxRes.value as { rates?: Record<string, number> }).rates ?? {}
    usdKrw = num(rates.KRW)
    const cny = num(rates.CNY)
    const usd = items.find((item) => item.id === 'usd')
    const cnyItem = items.find((item) => item.id === 'cny')
    if (usd) usd.krw = usdKrw
    if (cnyItem && usdKrw && cny) cnyItem.krw = usdKrw / cny
  }

  if (upbitRes.status === 'fulfilled' && Array.isArray(upbitRes.value)) {
    const map: Record<string, MarketId> = {
      'KRW-BTC': 'btc',
      'KRW-ETH': 'eth',
      'KRW-XRP': 'xrp',
      'KRW-SOL': 'sol',
    }
    for (const row of upbitRes.value as Array<{ market?: string; trade_price?: number; signed_change_rate?: number }>) {
      const id = row.market ? map[row.market] : undefined
      const item = id ? items.find((entry) => entry.id === id) : undefined
      if (!item) continue
      item.krw = num(row.trade_price)
      item.change = num(row.signed_change_rate) != null ? Number(row.signed_change_rate) * 100 : null
    }
  }

  if (binanceRes.status === 'fulfilled' && Array.isArray(binanceRes.value)) {
    const map: Record<string, MarketId> = {
      BTCUSDT: 'btc',
      ETHUSDT: 'eth',
      XRPUSDT: 'xrp',
      SOLUSDT: 'sol',
    }
    for (const row of binanceRes.value as Array<{ symbol?: string; lastPrice?: string; priceChangePercent?: string }>) {
      const id = row.symbol ? map[row.symbol] : undefined
      const item = id ? items.find((entry) => entry.id === id) : undefined
      if (!item) continue
      item.usd = num(row.lastPrice)
      if (item.change == null) item.change = num(row.priceChangePercent)
    }
  }

  const data = { now: Date.now(), items }
  if (items.some((item) => item.krw != null || item.usd != null)) cache = { at: Date.now(), data }
  return data
}

export async function getMarkets(): Promise<MarketsPayload> {
  const age = cache ? Date.now() - cache.at : Infinity
  if (cache && age < FRESH_MS) return cache.data
  if (cache && age < STALE_MS) {
    if (!inflight) inflight = refreshMarkets().finally(() => { inflight = null })
    return cache.data
  }
  if (inflight) return inflight
  inflight = refreshMarkets().finally(() => { inflight = null })
  try {
    return await inflight
  } catch {
    return cache?.data ?? { now: Date.now(), items: emptyItems() }
  }
}

export function formatKrw(value: number | null) {
  if (value == null) return '-'
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(2)}억`
  if (value >= 10_000) return `${Math.round(value).toLocaleString('ko-KR')}원`
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}원`
}

export function formatUsd(value: number | null) {
  if (value == null) return '-'
  if (value >= 1000) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatChange(value: number | null) {
  if (value == null) return ''
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}
