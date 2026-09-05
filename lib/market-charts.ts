export type ChartSeriesId =
  | 'usd'
  | 'cny'
  | 'btc'
  | 'eth'
  | 'xrp'
  | 'sol'
  | 'spx'
  | 'nasdaq'
  | 'kospi'
  | 'kosdaq'

export type IndexId = 'spx' | 'nasdaq' | 'kospi' | 'kosdaq'

export type IndexQuote = {
  id: IndexId
  label: string
  note: string
  value: number | null
  change: number | null
}

export type MarketChartsPayload = {
  now: number
  series: Partial<Record<ChartSeriesId, number[]>>
  indices: IndexQuote[]
  fxChange: Partial<Record<'usd' | 'cny', number | null>>
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const FRESH_MS = 5 * 60_000
const STALE_MS = 30 * 60_000

const INDEX_META: Record<IndexId, { symbol: string; label: string; note: string }> = {
  spx: { symbol: '^GSPC', label: 'S&P 500', note: '미국 대표 지수' },
  nasdaq: { symbol: '^IXIC', label: '나스닥', note: '미국 기술주 지수' },
  kospi: { symbol: '^KS11', label: '코스피', note: '한국 유가증권시장' },
  kosdaq: { symbol: '^KQ11', label: '코스닥', note: '한국 코스닥 시장' },
}

const COIN_UPBIT: Record<'btc' | 'eth' | 'xrp' | 'sol', string> = {
  btc: 'KRW-BTC',
  eth: 'KRW-ETH',
  xrp: 'KRW-XRP',
  sol: 'KRW-SOL',
}

const COIN_BINANCE: Record<'btc' | 'eth' | 'xrp' | 'sol', string> = {
  btc: 'BTCUSDT',
  eth: 'ETHUSDT',
  xrp: 'XRPUSDT',
  sol: 'SOLUSDT',
}

let cache: { at: number; data: MarketChartsPayload } | null = null
let inflight: Promise<MarketChartsPayload> | null = null

function num(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function downsample(points: number[], max = 56) {
  if (points.length <= max) return points
  const out: number[] = []
  const step = (points.length - 1) / (max - 1)
  for (let i = 0; i < max; i += 1) {
    const value = points[Math.round(i * step)]
    if (value != null) out.push(value)
  }
  return out
}

async function fetchJson(url: string, timeout = 8000) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
    cache: 'no-store',
    signal: AbortSignal.timeout(timeout),
  })
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  return res.json()
}

type YahooChart = {
  points: number[]
  price: number | null
  change: number | null
}

async function fetchYahoo(symbol: string): Promise<YahooChart | null> {
  try {
    const data = (await fetchJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=7d&interval=1h`
    )) as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number }
          indicators?: { quote?: Array<{ close?: Array<number | null> }> }
        }>
      }
    }
    const row = data.chart?.result?.[0]
    if (!row) return null
    const closes = (row.indicators?.quote?.[0]?.close ?? []).filter((value): value is number => value != null)
    const price = num(row.meta?.regularMarketPrice) ?? closes.at(-1) ?? null
    const prev = num(row.meta?.previousClose) ?? num(row.meta?.chartPreviousClose)
    const change = price != null && prev ? ((price - prev) / prev) * 100 : null
    return { points: downsample(closes), price, change }
  } catch {
    return null
  }
}

async function fetchUpbitHours(market: string): Promise<number[]> {
  const rows = (await fetchJson(
    `https://api.upbit.com/v1/candles/minutes/60?market=${market}&count=168`
  )) as Array<{ trade_price?: number }>
  if (!Array.isArray(rows)) return []
  return downsample(
    rows
      .map((row) => num(row.trade_price))
      .filter((value): value is number => value != null)
      .reverse()
  )
}

async function fetchBinanceHours(symbol: string): Promise<number[]> {
  const rows = (await fetchJson(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=168`
  )) as Array<Array<number | string>>
  if (!Array.isArray(rows)) return []
  return downsample(
    rows.map((row) => num(row[4])).filter((value): value is number => value != null)
  )
}

async function fetchFrankfurterFx() {
  const end = new Date()
  const start = new Date(end.getTime() - 8 * 86_400_000)
  const fmt = (date: Date) => date.toISOString().slice(0, 10)
  const data = (await fetchJson(
    `https://api.frankfurter.app/${fmt(start)}..${fmt(end)}?from=USD&to=KRW,CNY`
  )) as { rates?: Record<string, { KRW?: number; CNY?: number }> }
  const usd: number[] = []
  const cny: number[] = []
  for (const rate of Object.values(data.rates ?? {})) {
    const krw = num(rate.KRW)
    const cnyPerUsd = num(rate.CNY)
    if (krw) usd.push(krw)
    if (krw && cnyPerUsd) cny.push(krw / cnyPerUsd)
  }
  return { usd, cny }
}

async function refreshCharts(): Promise<MarketChartsPayload> {
  const series: MarketChartsPayload['series'] = {}
  const fxChange: MarketChartsPayload['fxChange'] = {}

  const [usd, cny, ...coins] = await Promise.all([
    fetchYahoo('KRW=X'),
    fetchYahoo('CNYKRW=X'),
    ...(['btc', 'eth', 'xrp', 'sol'] as const).map(async (id) => {
      try {
        const points = await fetchUpbitHours(COIN_UPBIT[id])
        if (points.length >= 2) return [id, points] as const
      } catch {
        /* fallback */
      }
      try {
        return [id, await fetchBinanceHours(COIN_BINANCE[id])] as const
      } catch {
        return [id, [] as number[]] as const
      }
    }),
  ])

  if (usd?.points.length) {
    series.usd = usd.points
    fxChange.usd = usd.change
  }
  if (cny?.points.length) {
    series.cny = cny.points
    fxChange.cny = cny.change
  }

  if (!series.usd || !series.cny) {
    try {
      const fallback = await fetchFrankfurterFx()
      if (!series.usd && fallback.usd.length >= 2) series.usd = downsample(fallback.usd)
      if (!series.cny && fallback.cny.length >= 2) series.cny = downsample(fallback.cny)
    } catch {
      /* keep what we have */
    }
  }

  for (const [id, points] of coins) {
    if (points.length >= 2) series[id] = points
  }

  const indexRows = await Promise.all(
    (Object.keys(INDEX_META) as IndexId[]).map(async (id) => {
      const meta = INDEX_META[id]
      const chart = await fetchYahoo(meta.symbol)
      if (chart?.points.length) series[id] = chart.points
      return {
        id,
        label: meta.label,
        note: meta.note,
        value: chart?.price ?? null,
        change: chart?.change ?? null,
      } satisfies IndexQuote
    })
  )

  const data: MarketChartsPayload = {
    now: Date.now(),
    series,
    indices: indexRows,
    fxChange,
  }
  if (Object.keys(series).length) cache = { at: Date.now(), data }
  return cache?.data ?? data
}

export async function getMarketCharts(): Promise<MarketChartsPayload> {
  const age = cache ? Date.now() - cache.at : Infinity
  if (cache && age < FRESH_MS) return cache.data
  if (cache && age < STALE_MS) {
    if (!inflight) inflight = refreshCharts().finally(() => {
      inflight = null
    })
    return cache.data
  }
  if (inflight) return inflight
  inflight = refreshCharts().finally(() => {
    inflight = null
  })
  try {
    return await inflight
  } catch {
    return (
      cache?.data ?? {
        now: Date.now(),
        series: {},
        indices: (Object.keys(INDEX_META) as IndexId[]).map((id) => ({
          id,
          label: INDEX_META[id].label,
          note: INDEX_META[id].note,
          value: null,
          change: null,
        })),
        fxChange: {},
      }
    )
  }
}

export function formatIndex(value: number | null) {
  if (value == null) return '-'
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
