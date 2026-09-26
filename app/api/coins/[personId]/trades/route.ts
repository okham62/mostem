import { auth } from '@/auth'
import {
  canSell,
  holdingsFromTrades,
  MAX_TRADE_FILE_BYTES,
  MAX_TRADE_FILES,
  num,
  type CoinTrade,
  type CoinTradeFile,
  type CoinTradeSide,
} from '@/lib/coin-ledger'
import { getCoinPerson, newTradeId, upsertCoinTrade } from '@/lib/coin-ledger-store'
import { NextResponse } from 'next/server'

function asFiles(value: unknown): CoinTradeFile[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && typeof item.name === 'string' && typeof item.data === 'string')
    .slice(0, MAX_TRADE_FILES)
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : newTradeId(),
      name: String(item.name),
      mime: String(item.mime || 'application/octet-stream'),
      size: num(item.size),
      data: String(item.data),
    }))
    .filter((item) => item.size <= MAX_TRADE_FILE_BYTES && item.data.length < MAX_TRADE_FILE_BYTES * 1.4)
}

export async function POST(req: Request, { params }: { params: { personId: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const symbol = String(body?.symbol ?? '').trim().toUpperCase()
  const coinName = String(body?.coinName ?? symbol).trim()
  const side = body?.side === 'sell' ? 'sell' : 'buy'
  const tradedAt = String(body?.tradedAt ?? '').slice(0, 10)
  const qty = num(body?.qty)
  const unitPrice = num(body?.unitPrice)
  const fee = Math.max(0, num(body?.fee))
  const amount = num(body?.amount) || qty * unitPrice + (side === 'buy' ? fee : 0)
  const exchange = String(body?.exchange ?? 'upbit')
  const memo = String(body?.memo ?? '').trim()
  if (!symbol || !tradedAt || qty <= 0 || unitPrice <= 0) {
    return NextResponse.json({ error: '코인, 날짜, 수량, 단가를 입력하세요.' }, { status: 400 })
  }

  const person = await getCoinPerson(session.user.id, params.personId)
  if (!person) return NextResponse.json({ error: '사람을 찾지 못했습니다.' }, { status: 404 })

  const tradeId = typeof body?.id === 'string' && body.id ? body.id : newTradeId()
  const existing = person.trades.find((item) => item.id === tradeId)
  const uploaded = asFiles(body?.files)
  const kept = Array.isArray(body?.files)
    ? (body.files as Array<{ id?: string; name?: string }>)
        .map((item) => existing?.files.find((file) => file.id === item.id || file.name === item.name))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : existing?.files ?? []
  const nextFiles = [
    ...kept.filter((item) => !uploaded.some((file) => file.name === item.name)),
    ...uploaded,
  ].slice(0, MAX_TRADE_FILES)

  if (side === 'sell') {
    const holdings = holdingsFromTrades(person.trades)
    const holding = holdings.find((item) => item.symbol === symbol)
    if (!canSell(holding, qty, existing ? tradeId : undefined)) {
      return NextResponse.json({ error: '가진 수량보다 많이 팔 수 없습니다.' }, { status: 400 })
    }
  }

  const trade: CoinTrade = {
    id: tradeId,
    symbol,
    coinName,
    side: side as CoinTradeSide,
    tradedAt,
    qty,
    unitPrice,
    amount,
    fee,
    exchange,
    memo,
    files: nextFiles,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  }

  try {
    const people = await upsertCoinTrade(session.user.id, params.personId, trade)
    return NextResponse.json({ people })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '거래를 저장하지 못했습니다.' },
      { status: 500 },
    )
  }
}
