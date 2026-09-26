export const COIN_EXCHANGES = [
  { id: 'upbit', label: '업비트' },
  { id: 'bithumb', label: '빗썸' },
  { id: 'coinone', label: '코인원' },
  { id: 'korbit', label: '코빗' },
  { id: 'binance', label: '바이낸스' },
  { id: 'bybit', label: '바이비트' },
  { id: 'other', label: '기타' },
] as const

export const MAX_TRADE_FILES = 5
export const MAX_TRADE_FILE_BYTES = 2 * 1024 * 1024

export type CoinTradeSide = 'buy' | 'sell'

export type CoinTradeFile = {
  id: string
  name: string
  mime: string
  size: number
  data?: string
}

export type CoinTrade = {
  id: string
  symbol: string
  coinName: string
  side: CoinTradeSide
  tradedAt: string
  qty: number
  unitPrice: number
  amount: number
  fee: number
  exchange: string
  memo: string
  files: CoinTradeFile[]
  createdAt: string
}

export type CoinPerson = {
  id: string
  name: string
  trades: CoinTrade[]
}

export type CoinHolding = {
  symbol: string
  coinName: string
  qty: number
  avg: number
  principal: number
  realized: number
  buyTotal: number
  trades: CoinTrade[]
}

export type CoinLedgerRow = {
  trade: CoinTrade
  signedQty: number
  signedAmount: number
  afterQty: number
  afterPrincipal: number
  afterAvg: number
}

export function exchangeLabel(id: string) {
  return COIN_EXCHANGES.find((item) => item.id === id)?.label ?? id
}

export function publicTradeFiles(files: CoinTradeFile[] = []): CoinTradeFile[] {
  return files.map((file) => ({
    id: file.id,
    name: file.name,
    mime: file.mime,
    size: file.size,
  }))
}

export function stripPersonFiles(person: CoinPerson): CoinPerson {
  return {
    ...person,
    trades: person.trades.map((trade) => ({ ...trade, files: publicTradeFiles(trade.files) })),
  }
}

function sortTrades(trades: CoinTrade[]) {
  return [...trades].sort((a, b) => {
    const byDate = a.tradedAt.localeCompare(b.tradedAt)
    return byDate || a.createdAt.localeCompare(b.createdAt)
  })
}

export function runningLedger(trades: CoinTrade[]): CoinLedgerRow[] {
  const sorted = sortTrades(trades)
  let qty = 0
  let principal = 0
  return sorted.map((trade) => {
    if (trade.side === 'buy') {
      qty += trade.qty
      principal += trade.amount
    } else {
      const sold = qty > 0 ? Math.min(trade.qty, qty) : 0
      const avg = qty > 0 ? principal / qty : 0
      principal -= avg * sold
      qty -= sold
    }
    if (qty < 1e-12) {
      qty = 0
      principal = 0
    }
    return {
      trade,
      signedQty: trade.side === 'buy' ? trade.qty : -trade.qty,
      signedAmount: trade.side === 'buy' ? trade.amount : -trade.amount,
      afterQty: qty,
      afterPrincipal: principal,
      afterAvg: qty > 0 ? principal / qty : 0,
    }
  })
}

export function holdingsFromTrades(trades: CoinTrade[]): CoinHolding[] {
  const groups = new Map<string, CoinTrade[]>()
  for (const trade of trades) {
    const key = trade.symbol.toUpperCase()
    const list = groups.get(key) ?? []
    list.push(trade)
    groups.set(key, list)
  }
  return [...groups.entries()]
    .map(([symbol, list]) => summarizeCoin(symbol, list))
    .sort((a, b) => b.principal - a.principal || a.symbol.localeCompare(b.symbol))
}

export function summarizeCoin(symbol: string, trades: CoinTrade[]): CoinHolding {
  const sorted = sortTrades(trades)
  let qty = 0
  let principal = 0
  let realized = 0
  let buyTotal = 0
  for (const trade of sorted) {
    if (trade.side === 'buy') {
      qty += trade.qty
      principal += trade.amount
      buyTotal += trade.amount
      continue
    }
    if (qty <= 0) continue
    const sold = Math.min(trade.qty, qty)
    const avg = principal / qty
    principal -= avg * sold
    qty -= sold
    realized += (trade.unitPrice - avg) * sold - (trade.fee || 0)
  }
  if (qty < 1e-12) {
    qty = 0
    principal = 0
  }
  return {
    symbol: symbol.toUpperCase(),
    coinName: sorted[0]?.coinName || symbol.toUpperCase(),
    qty,
    avg: qty > 0 ? principal / qty : 0,
    principal,
    realized,
    buyTotal,
    trades: sorted,
  }
}

export function canSell(holding: CoinHolding | undefined, qty: number, ignoreTradeId?: string) {
  if (!holding) return qty <= 0
  const replay = ignoreTradeId
    ? summarizeCoin(
        holding.symbol,
        holding.trades.filter((item) => item.id !== ignoreTradeId),
      )
    : holding
  return qty <= replay.qty + 1e-12
}

export function num(value: unknown) {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function formatKrw(value: number, digits = 0) {
  return `${new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(Math.round(value * 10 ** digits) / 10 ** digits)}원`
}

export function formatQty(value: number) {
  if (!value) return '0'
  const abs = Math.abs(value)
  const digits = abs >= 1 ? 4 : abs >= 0.01 ? 6 : 8
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatSignedKrw(value: number) {
  const text = formatKrw(Math.abs(value))
  if (value > 0) return `+${text}`
  if (value < 0) return `-${text}`
  return text
}

export function formatSignedQty(value: number) {
  const text = formatQty(Math.abs(value))
  if (value > 0) return `+${text}`
  if (value < 0) return `-${text}`
  return text
}

export function formatPct(value: number) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export function todayIso() {
  const now = new Date()
  const off = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - off).toISOString().slice(0, 10)
}
