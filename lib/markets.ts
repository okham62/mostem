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

const COIN_IDS: Record<Exclude<MarketId, 'usd' | 'cny'>, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  xrp: 'ripple',
  sol: 'solana',
}

function num(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function hasPrice(item: MarketItem) {
  return item.krw != null || item.usd != null
}

function hasAnyPrice(items: MarketItem[]) {
  return items.some(hasPrice)
}

async function fetchJson(url: string, timeout = 7000) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(timeout),
  })
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  return res.json()
}

export function emptyMarketItems(): MarketItem[] {
  return [
    { id: 'usd', label: '원달러', image: ICONS.usd, krw: null, usd: 1, change: null, kind: 'fx' },
    { id: 'cny', label: '중국환율', image: ICONS.cny, krw: null, usd: null, change: null, kind: 'fx' },
    { id: 'btc', label: '비트코인', image: ICONS.btc, krw: null, usd: null, change: null, kind: 'coin' },
    { id: 'eth', label: '이더리움', image: ICONS.eth, krw: null, usd: null, change: null, kind: 'coin' },
    { id: 'xrp', label: '리플', image: ICONS.xrp, krw: null, usd: null, change: null, kind: 'coin' },
    { id: 'sol', label: '솔라나', image: ICONS.sol, krw: null, usd: null, change: null, kind: 'coin' },
  ]
}

export function mergeMarketItems(prev: MarketItem[] | undefined, next: MarketItem[]) {
  if (!prev?.length) return next
  return next.map((item) => {
    const last = prev.find((entry) => entry.id === item.id)
    if (!last) return item
    return {
      ...item,
      krw: item.krw ?? last.krw,
      usd: item.usd ?? last.usd,
      change: item.change ?? last.change,
    }
  })
}

async function fillFx(items: MarketItem[]) {
  const sources = [
    async () => {
      const data = await fetchJson('https://open.er-api.com/v6/latest/USD')
      const rates = (data as { rates?: Record<string, number> }).rates ?? {}
      return { usdKrw: num(rates.KRW), usdCny: num(rates.CNY) }
    },
    async () => {
      const data = await fetchJson('https://api.frankfurter.app/latest?from=USD&to=KRW,CNY')
      const rates = (data as { rates?: Record<string, number> }).rates ?? {}
      return { usdKrw: num(rates.KRW), usdCny: num(rates.CNY) }
    },
  ]

  for (const source of sources) {
    try {
      const { usdKrw, usdCny } = await source()
      const usd = items.find((item) => item.id === 'usd')
      const cny = items.find((item) => item.id === 'cny')
      if (usd && usdKrw) usd.krw = usdKrw
      if (cny && usdKrw && usdCny) cny.krw = usdKrw / usdCny
      if (usd?.krw != null) return
    } catch {
      /* try next */
    }
  }
}

async function fillCoins(items: MarketItem[]) {
  try {
    const rows = await fetchJson('https://api.upbit.com/v1/ticker?markets=KRW-BTC,KRW-ETH,KRW-XRP,KRW-SOL')
    if (Array.isArray(rows)) {
      const map: Record<string, MarketId> = {
        'KRW-BTC': 'btc',
        'KRW-ETH': 'eth',
        'KRW-XRP': 'xrp',
        'KRW-SOL': 'sol',
      }
      for (const row of rows as Array<{ market?: string; trade_price?: number; signed_change_rate?: number }>) {
        const id = row.market ? map[row.market] : undefined
        const item = id ? items.find((entry) => entry.id === id) : undefined
        if (!item) continue
        item.krw = num(row.trade_price)
        item.change = num(row.signed_change_rate) != null ? Number(row.signed_change_rate) * 100 : null
      }
    }
  } catch {
    /* fallback below */
  }

  try {
    const rows = await fetchJson(
      'https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","XRPUSDT","SOLUSDT"]'
    )
    if (Array.isArray(rows)) {
      const map: Record<string, MarketId> = {
        BTCUSDT: 'btc',
        ETHUSDT: 'eth',
        XRPUSDT: 'xrp',
        SOLUSDT: 'sol',
      }
      for (const row of rows as Array<{ symbol?: string; lastPrice?: string; priceChangePercent?: string }>) {
        const id = row.symbol ? map[row.symbol] : undefined
        const item = id ? items.find((entry) => entry.id === id) : undefined
        if (!item) continue
        item.usd = num(row.lastPrice)
        if (item.change == null) item.change = num(row.priceChangePercent)
      }
    }
  } catch {
    /* fallback below */
  }

  if (items.filter((item) => item.kind === 'coin').every(hasPrice)) return

  try {
    const ids = Object.values(COIN_IDS).join(',')
    const data = (await fetchJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=krw,usd&include_24hr_change=true`
    )) as Record<string, { krw?: number; usd?: number; krw_24h_change?: number }>
    for (const [id, geckoId] of Object.entries(COIN_IDS) as Array<[Exclude<MarketId, 'usd' | 'cny'>, string]>) {
      const item = items.find((entry) => entry.id === id)
      const row = data[geckoId]
      if (!item || !row) continue
      item.krw = item.krw ?? num(row.krw)
      item.usd = item.usd ?? num(row.usd)
      item.change = item.change ?? num(row.krw_24h_change)
    }
  } catch {
    /* keep what we have */
  }
}

async function refreshMarkets(): Promise<MarketsPayload> {
  const items = emptyMarketItems()
  await Promise.allSettled([fillFx(items), fillCoins(items)])
  const merged = mergeMarketItems(cache?.data.items, items)
  const data = { now: Date.now(), items: merged }
  if (hasAnyPrice(merged)) cache = { at: Date.now(), data }
  return cache?.data ?? data
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
    const data = await inflight
    return hasAnyPrice(data.items) ? data : cache?.data ?? data
  } catch {
    return cache?.data ?? { now: Date.now(), items: emptyMarketItems() }
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
