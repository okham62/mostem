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

function pctChange(points: number[]) {
  const first = points[0]
  const last = points[points.length - 1]
  if (first == null || last == null || first === 0) return null
  return ((last - first) / first) * 100
}

async function fetchJson(url: string, timeout = 4500) {
  const headers: HeadersInit =
    typeof window === 'undefined'
      ? { Accept: 'application/json', 'User-Agent': UA }
      : { Accept: 'application/json' }
  const res = await fetch(url, {
    headers,
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
    `https://api.upbit.com/v1/candles/minutes/60?market=${market}&count=168`,
    typeof window === 'undefined' ? 3000 : 6000
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
  const timeout = typeof window === 'undefined' ? 2500 : 6000
  const urls = [
    `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=1h&limit=168`,
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=168`,
  ]
  for (const url of urls) {
    try {
      const rows = (await fetchJson(url, timeout)) as Array<Array<number | string>>
      if (!Array.isArray(rows)) continue
      const points = downsample(
        rows.map((row) => num(row[4])).filter((value): value is number => value != null)
      )
      if (points.length >= 2) return points
    } catch {
      /* try next host */
    }
  }
  return []
}

async function fetchFrankfurterFx() {
  const end = new Date()
  const start = new Date(end.getTime() - 8 * 86_400_000)
  const fmt = (date: Date) => date.toISOString().slice(0, 10)
  const data = (await fetchJson(
    `https://api.frankfurter.app/${fmt(start)}..${fmt(end)}?from=USD&to=KRW,CNY`,
    typeof window === 'undefined' ? 4000 : 6000
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

async function fetchCoinHours(id: 'btc' | 'eth' | 'xrp' | 'sol') {
  try {
    const points = await fetchBinanceHours(COIN_BINANCE[id])
    if (points.length >= 2) return points
  } catch {
    /* try upbit */
  }
  try {
    const points = await fetchUpbitHours(COIN_UPBIT[id])
    if (points.length >= 2) return points
  } catch {
    /* keep empty */
  }
  return []
}

export function mergeMarketCharts(
  prev: MarketChartsPayload | null | undefined,
  next: MarketChartsPayload | null | undefined
): MarketChartsPayload | null {
  if (!prev) return next ?? null
  if (!next) return prev
  const series = { ...prev.series }
  for (const key of Object.keys(next.series) as ChartSeriesId[]) {
    const points = next.series[key]
    if (points && points.length >= 2) series[key] = points
  }
  const indices = next.indices.length
    ? next.indices.map((row) => {
        const old = prev.indices.find((item) => item.id === row.id)
        return {
          ...row,
          value: row.value ?? old?.value ?? null,
          change: row.change ?? old?.change ?? null,
        }
      })
    : prev.indices
  return {
    now: Math.max(prev.now, next.now),
    series,
    indices,
    fxChange: {
      usd: next.fxChange.usd ?? prev.fxChange.usd ?? null,
      cny: next.fxChange.cny ?? prev.fxChange.cny ?? null,
    },
  }
}

export async function fetchBrowserMarketCharts(): Promise<MarketChartsPayload | null> {
  if (typeof window === 'undefined') return null
  const series: MarketChartsPayload['series'] = {}
  const fxChange: MarketChartsPayload['fxChange'] = {}
  const coinIds = ['btc', 'eth', 'xrp', 'sol'] as const
  const [frank, ...coinRows] = await Promise.all([
    fetchFrankfurterFx().catch(() => ({ usd: [] as number[], cny: [] as number[] })),
    ...coinIds.map(async (id) => [id, await fetchCoinHours(id)] as const),
  ])
  if (frank.usd.length >= 2) {
    series.usd = downsample(frank.usd)
    fxChange.usd = pctChange(frank.usd)
  }
  if (frank.cny.length >= 2) {
    series.cny = downsample(frank.cny)
    fxChange.cny = pctChange(frank.cny)
  }
  for (const [id, points] of coinRows) {
    if (points.length >= 2) series[id] = points
  }
  if (!Object.keys(series).length) return null
  return { now: Date.now(), series, indices: [], fxChange }
}

function keepSeries(next: MarketChartsPayload['series']) {
  const prev = cache?.data.series ?? {}
  for (const key of Object.keys(prev) as ChartSeriesId[]) {
    if ((!next[key] || (next[key]?.length ?? 0) < 2) && (prev[key]?.length ?? 0) >= 2) {
      next[key] = prev[key]
    }
  }
  return next
}

async function refreshCharts(): Promise<MarketChartsPayload> {
  const series: MarketChartsPayload['series'] = {}
  const fxChange: MarketChartsPayload['fxChange'] = {}

  const [usd, cny, frank, coinRows, indexRows] = await Promise.all([
    fetchYahoo('KRW=X'),
    fetchYahoo('CNYKRW=X'),
    fetchFrankfurterFx().catch(() => ({ usd: [] as number[], cny: [] as number[] })),
    Promise.all(
      (['btc', 'eth', 'xrp', 'sol'] as const).map(async (id) => [id, await fetchCoinHours(id)] as const)
    ),
    Promise.all(
      (Object.keys(INDEX_META) as IndexId[]).map(async (id) => {
        const meta = INDEX_META[id]
        const chart = await fetchYahoo(meta.symbol)
        if (chart?.points.length) series[id] = chart.points
        return {
          id,
          label: meta.label,
          note: meta.note,
          value: chart?.price ?? cache?.data.indices.find((row) => row.id === id)?.value ?? null,
          change: chart?.change ?? cache?.data.indices.find((row) => row.id === id)?.change ?? null,
        } satisfies IndexQuote
      })
    ),
  ])

  if (usd?.points.length) {
    series.usd = usd.points
    fxChange.usd = usd.change
  }
  if (cny?.points.length) {
    series.cny = cny.points
    fxChange.cny = cny.change
  }
  if (!series.usd && frank.usd.length >= 2) series.usd = downsample(frank.usd)
  if (!series.cny && frank.cny.length >= 2) series.cny = downsample(frank.cny)

  for (const [id, points] of coinRows) {
    if (points.length >= 2) series[id] = points
  }

  const data: MarketChartsPayload = {
    now: Date.now(),
    series: keepSeries(series),
    indices: indexRows.map((row) => {
      const prev = cache?.data.indices.find((item) => item.id === row.id)
      return {
        ...row,
        value: row.value ?? prev?.value ?? null,
        change: row.change ?? prev?.change ?? null,
      }
    }),
    fxChange: {
      usd: fxChange.usd ?? cache?.data.fxChange.usd ?? null,
      cny: fxChange.cny ?? cache?.data.fxChange.cny ?? null,
    },
  }
  if (Object.keys(data.series).length) cache = { at: Date.now(), data }
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
