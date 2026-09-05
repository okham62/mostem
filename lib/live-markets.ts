'use client'

import {
  emptyMarketItems,
  mergeMarketItems,
  type MarketId,
  type MarketItem,
  type MarketsPayload,
} from '@/lib/markets'

const STORAGE_KEY = 'mostem:markets-v1'
const FX_POLL_MS = 45_000
const UPBIT_CODES = ['KRW-BTC', 'KRW-ETH', 'KRW-XRP', 'KRW-SOL'] as const
const UPBIT_MAP: Record<string, MarketId> = {
  'KRW-BTC': 'btc',
  'KRW-ETH': 'eth',
  'KRW-XRP': 'xrp',
  'KRW-SOL': 'sol',
}
const BINANCE_MAP: Record<string, MarketId> = {
  BTCUSDT: 'btc',
  ETHUSDT: 'eth',
  XRPUSDT: 'xrp',
  SOLUSDT: 'sol',
}

type Listener = (items: MarketItem[]) => void

const listeners = new Set<Listener>()
let items: MarketItem[] = emptyMarketItems()
let started = false
let upbitWs: WebSocket | null = null
let binanceWs: WebSocket | null = null
let upbitRetry = 0
let binanceRetry = 0

function snapshot() {
  return items.map((item) => ({ ...item }))
}

function emit() {
  const next = snapshot()
  listeners.forEach((listener) => listener(next))
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ now: Date.now(), items: next } satisfies MarketsPayload)
    )
  } catch {
    /* ignore */
  }
}

function patch(id: MarketId, partial: Partial<MarketItem>) {
  let changed = false
  items = items.map((item) => {
    if (item.id !== id) return item
    const next = { ...item, ...partial }
    if (next.krw === item.krw && next.usd === item.usd && next.change === item.change) return item
    changed = true
    return next
  })
  if (changed) emit()
}

function readStored() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as MarketsPayload
    if (Array.isArray(parsed?.items) && parsed.items.length) {
      items = mergeMarketItems(items, parsed.items)
    }
  } catch {
    /* ignore */
  }
}

function backoff(attempt: number) {
  return Math.min(10_000, 600 * 2 ** attempt)
}

function connectUpbit() {
  if (typeof window === 'undefined') return
  try {
    upbitWs?.close()
  } catch {
    /* ignore */
  }

  const ws = new WebSocket('wss://api.upbit.com/websocket/v1')
  upbitWs = ws
  ws.binaryType = 'arraybuffer'

  ws.onopen = () => {
    upbitRetry = 0
    ws.send(
      JSON.stringify([
        { ticket: `mostem-${Date.now()}` },
        { type: 'ticker', codes: [...UPBIT_CODES], isOnlyRealtime: true },
      ])
    )
  }

  ws.onmessage = (event) => {
    try {
      const text =
        typeof event.data === 'string'
          ? event.data
          : new TextDecoder().decode(event.data as ArrayBuffer)
      const row = JSON.parse(text) as {
        code?: string
        trade_price?: number
        signed_change_rate?: number
      }
      const id = row.code ? UPBIT_MAP[row.code] : undefined
      if (!id) return
      const next: Partial<MarketItem> = {}
      const krw = Number(row.trade_price)
      const change = Number(row.signed_change_rate)
      if (Number.isFinite(krw)) next.krw = krw
      if (Number.isFinite(change)) next.change = change * 100
      patch(id, next)
    } catch {
      /* ignore one tick */
    }
  }

  ws.onclose = () => {
    if (upbitWs !== ws) return
    window.setTimeout(connectUpbit, backoff(upbitRetry++))
  }

  ws.onerror = () => {
    try {
      ws.close()
    } catch {
      /* ignore */
    }
  }
}

function connectBinance() {
  if (typeof window === 'undefined') return
  try {
    binanceWs?.close()
  } catch {
    /* ignore */
  }

  const streams = 'btcusdt@ticker/ethusdt@ticker/xrpusdt@ticker/solusdt@ticker'
  const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)
  binanceWs = ws

  ws.onopen = () => {
    binanceRetry = 0
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(String(event.data)) as {
        data?: { s?: string; c?: string; P?: string }
      }
      const row = msg.data
      const id = row?.s ? BINANCE_MAP[row.s] : undefined
      if (!id) return
      const usd = Number(row?.c)
      if (Number.isFinite(usd)) patch(id, { usd })
    } catch {
      /* ignore one tick */
    }
  }

  ws.onclose = () => {
    if (binanceWs !== ws) return
    window.setTimeout(connectBinance, backoff(binanceRetry++))
  }

  ws.onerror = () => {
    try {
      ws.close()
    } catch {
      /* ignore */
    }
  }
}

async function hydrateRest() {
  try {
    const res = await fetch('/api/markets', { cache: 'no-store' })
    if (!res.ok) return
    const next = (await res.json()) as MarketsPayload
    if (!Array.isArray(next?.items)) return
    items = mergeMarketItems(items, next.items)
    emit()
  } catch {
    /* keep live / stored */
  }
}

function start() {
  if (started || typeof window === 'undefined') return
  started = true
  readStored()
  emit()
  void hydrateRest()
  connectUpbit()
  connectBinance()
  window.setInterval(() => {
    void hydrateRest()
  }, FX_POLL_MS)
}

export function subscribeLiveMarkets(listener: Listener) {
  listeners.add(listener)
  start()
  listener(snapshot())
  return () => {
    listeners.delete(listener)
  }
}
