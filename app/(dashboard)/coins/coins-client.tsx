'use client'

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { Paperclip, Plus, X } from 'lucide-react'
import {
  COIN_EXCHANGES,
  MAX_TRADE_FILE_BYTES,
  MAX_TRADE_FILES,
  exchangeLabel,
  formatKrw,
  formatPct,
  formatQty,
  formatSignedKrw,
  formatSignedQty,
  holdingsFromTrades,
  runningLedger,
  num,
  todayIso,
  type CoinPerson,
  type CoinTrade,
  type CoinTradeFile,
  type CoinTradeSide,
} from '@/lib/coin-ledger'
import type { CoinMarket, CoinPriceMap } from '@/lib/coin-prices'
import { cn } from '@/lib/utils'

type SheetState = {
  side: CoinTradeSide
  symbol: string
  coinName: string
  lockCoin: boolean
  edit?: CoinTrade
}

function logoUrl(symbol: string) {
  return `https://static.upbit.com/logos/${symbol.toUpperCase()}.png`
}

async function readFiles(list: FileList | File[]) {
  const out: CoinTradeFile[] = []
  for (const file of [...list].slice(0, MAX_TRADE_FILES)) {
    if (file.size > MAX_TRADE_FILE_BYTES) continue
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
      reader.readAsDataURL(file)
    })
    out.push({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      mime: file.type || 'application/octet-stream',
      size: file.size,
      data,
    })
  }
  return out
}

export function CoinsClient({ initial }: { initial: CoinPerson[] }) {
  const [people, setPeople] = useState(initial)
  const [personId, setPersonId] = useState(initial[0]?.id ?? '')
  const [prices, setPrices] = useState<CoinPriceMap>({})
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const person = people.find((item) => item.id === personId) ?? people[0]
  const holdings = useMemo(() => holdingsFromTrades(person?.trades ?? []), [person])
  const symbolKey = holdings.map((item) => item.symbol).join(',')

  useEffect(() => {
    const symbols = symbolKey ? symbolKey.split(',') : []
    if (!symbols.length) return
    const ctrl = new AbortController()
    const load = () => {
      void fetch(`/api/coins/markets?symbols=${symbols.join(',')}`, { cache: 'no-store', signal: ctrl.signal })
        .then((res) => res.json())
        .then((data) => {
          if (data.prices) setPrices(data.prices)
        })
        .catch(() => undefined)
    }
    load()
    const id = window.setInterval(load, 20000)
    return () => {
      ctrl.abort()
      window.clearInterval(id)
    }
  }, [symbolKey])

  const totals = holdings.reduce(
    (acc, item) => {
      const price = prices[item.symbol]?.krw ?? 0
      const value = item.qty * price
      acc.value += value
      acc.principal += item.principal
      acc.realized += item.realized
      acc.unrealized += value - item.principal
      return acc
    },
    { value: 0, principal: 0, realized: 0, unrealized: 0 },
  )
  const totalPnl = totals.unrealized + totals.realized
  const totalPct = totals.principal > 0 ? (totals.unrealized / totals.principal) * 100 : 0

  function applyPeople(next: CoinPerson[]) {
    setPeople(next)
    if (!next.some((item) => item.id === personId) && next[0]) setPersonId(next[0].id)
  }

  async function addPerson() {
    const name = window.prompt('사람 이름')
    if (!name?.trim()) return
    setSaving(true)
    const res = await fetch('/api/coins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMessage(data.error || '사람을 만들지 못했습니다.')
      return
    }
    if (Array.isArray(data.people)) applyPeople(data.people)
    if (data.person?.id) setPersonId(data.person.id)
  }

  async function removePerson() {
    if (!person) return
    if (people.length <= 1) {
      setMessage('사람은 한 명 이상 있어야 합니다.')
      return
    }
    if (!window.confirm(`「${person.name}」 장부를 삭제할까요? 거래도 같이 지워집니다.`)) return
    setSaving(true)
    const res = await fetch(`/api/coins/${person.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMessage(data.error || '삭제하지 못했습니다.')
      return
    }
    if (Array.isArray(data.people)) applyPeople(data.people)
  }

  async function removeTrade(trade: CoinTrade) {
    if (!person) return
    if (!window.confirm('이 거래를 삭제할까요? 평단이 다시 계산됩니다.')) return
    setSaving(true)
    const res = await fetch(`/api/coins/${person.id}/trades/${trade.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMessage(data.error || '삭제하지 못했습니다.')
      return
    }
    if (Array.isArray(data.people)) applyPeople(data.people)
  }

  async function openFile(trade: CoinTrade, file: CoinTradeFile) {
    if (!person) return
    const res = await fetch(`/api/coins/${person.id}/trades/${trade.id}/files?fileId=${file.id}`)
    const data = await res.json().catch(() => ({}))
    if (data.file?.data) window.open(data.file.data, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">코인 장부</h1>
          <p className="mt-1 text-sm text-white/45">사람별 매수·매도, 평단과 총자산이 자동으로 맞춰집니다.</p>
        </div>
        <button
          type="button"
          disabled={saving || !person}
          onClick={() => setSheet({ side: 'buy', symbol: '', coinName: '', lockCoin: false })}
          className="inline-flex items-center gap-1 rounded-xl bg-gold px-3 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          코인 추가
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {people.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPersonId(item.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-semibold',
              item.id === person?.id ? 'bg-gold text-black' : 'bg-white/8 text-white/70 hover:bg-white/12',
            )}
          >
            {item.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void addPerson()}
          className="rounded-full border border-dashed border-white/20 px-3 py-1.5 text-sm text-white/50 hover:text-white"
        >
          + 사람
        </button>
        {people.length > 1 ? (
          <button type="button" onClick={() => void removePerson()} className="ml-auto text-xs text-white/35 hover:text-red-300">
            이 사람 삭제
          </button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#141418] p-5">
        <p className="text-xs font-semibold text-white/40">총 자산</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-white">{formatKrw(totals.value)}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span className="text-white/50">
            원금 <b className="ml-1 font-semibold text-white">{formatKrw(totals.principal)}</b>
          </span>
          <span className={totalPnl >= 0 ? 'text-[#25a750]' : 'text-[#ca3f64]'}>
            평가손익 <b className="ml-1">{formatKrw(totals.unrealized)}</b> {formatPct(totalPct)}
          </span>
          <span className="text-white/50">
            실현손익 <b className="ml-1 text-white">{formatKrw(totals.realized)}</b>
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {holdings.length ? (
          holdings.map((item) => {
            const price = prices[item.symbol]?.krw ?? 0
            const value = item.qty * price
            const pnl = value - item.principal
            const pct = item.principal > 0 ? (pnl / item.principal) * 100 : 0
            const rows = runningLedger(item.trades)
            return (
              <div key={item.symbol} className="overflow-hidden rounded-2xl border border-white/10 bg-[#16161b]">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl(item.symbol)} alt="" className="h-9 w-9 rounded-full bg-white/5 object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">
                        {item.coinName} <span className="text-white/35">{item.symbol}</span>
                      </p>
                      <p className="text-[11px] text-white/40">
                        최종 {formatQty(item.qty)}개 · 최종평단 {formatKrw(item.avg)} · 최종원금 {formatKrw(item.principal)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{price ? formatKrw(value) : '시세 없음'}</p>
                    <p className={cn('text-[11px]', pnl >= 0 ? 'text-[#25a750]' : 'text-[#ca3f64]')}>
                      {formatKrw(pnl)} {formatPct(pct)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSheet({ side: 'buy', symbol: item.symbol, coinName: item.coinName, lockCoin: true })}
                      className="rounded-lg bg-white/8 px-2.5 py-1.5 text-[11px] font-semibold text-white"
                    >
                      매수
                    </button>
                    <button
                      type="button"
                      disabled={item.qty <= 0}
                      onClick={() => setSheet({ side: 'sell', symbol: item.symbol, coinName: item.coinName, lockCoin: true })}
                      className="rounded-lg bg-white/8 px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-30"
                    >
                      매도
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto border-t border-white/8">
                  <table className="w-full min-w-[720px] text-left text-[11px]">
                    <thead className="text-white/35">
                      <tr>
                        <th className="px-3 py-2 font-medium">날짜</th>
                        <th className="px-3 py-2 font-medium">수량</th>
                        <th className="px-3 py-2 font-medium">투자금</th>
                        <th className="px-3 py-2 font-medium">누적수량</th>
                        <th className="px-3 py-2 font-medium">누적원금</th>
                        <th className="px-3 py-2 font-medium">평단가</th>
                        <th className="px-3 py-2 font-medium">메모</th>
                        <th className="px-3 py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.trade.id} className="border-t border-white/5 text-white/75 hover:bg-white/4">
                          <td className="whitespace-nowrap px-3 py-2 text-white/45">{row.trade.tradedAt}</td>
                          <td className={cn('px-3 py-2 font-semibold', row.signedQty >= 0 ? 'text-[#25a750]' : 'text-[#ca3f64]')}>
                            {formatSignedQty(row.signedQty)}
                          </td>
                          <td className={cn('px-3 py-2 font-semibold', row.signedAmount >= 0 ? 'text-[#25a750]' : 'text-[#ca3f64]')}>
                            {formatSignedKrw(row.signedAmount)}
                          </td>
                          <td className="px-3 py-2">{formatQty(row.afterQty)}</td>
                          <td className="px-3 py-2">{formatKrw(row.afterPrincipal)}</td>
                          <td className="px-3 py-2 font-semibold text-white">{formatKrw(row.afterAvg)}</td>
                          <td className="max-w-[180px] truncate px-3 py-2 text-white/50" title={row.trade.memo}>
                            {row.trade.memo || '—'}
                            {row.trade.files.length ? (
                              <span className="ml-1 inline-flex items-center gap-1">
                                <Paperclip className="h-3 w-3" />
                                {row.trade.files.map((file) => (
                                  <button key={file.id} type="button" className="underline" onClick={() => void openFile(row.trade, file)}>
                                    {file.name}
                                  </button>
                                ))}
                              </span>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            <span className="text-white/30">{exchangeLabel(row.trade.exchange)}</span>
                            <button
                              type="button"
                              className="ml-2 text-white/35 hover:text-white"
                              onClick={() =>
                                setSheet({
                                  side: row.trade.side,
                                  symbol: row.trade.symbol,
                                  coinName: row.trade.coinName,
                                  lockCoin: true,
                                  edit: row.trade,
                                })
                              }
                            >
                              수정
                            </button>
                            <button type="button" className="ml-2 text-white/25 hover:text-red-300" onClick={() => void removeTrade(row.trade)}>
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/12 px-4 py-10 text-center text-sm text-white/40">
            아직 거래가 없습니다. 코인 추가나 매수로 한 줄만 넣으면 평단이 생깁니다.
          </div>
        )}
      </div>

      {message ? <p className="text-xs text-gold">{message}</p> : null}

      {sheet && person ? (
        <TradeSheet
          personId={person.id}
          holdingQty={holdings.find((item) => item.symbol === sheet.symbol)?.qty ?? 0}
          sheet={sheet}
          saving={saving}
          onClose={() => setSheet(null)}
          onSaving={setSaving}
          onDone={(next, error) => {
            if (error) setMessage(error)
            else {
              applyPeople(next)
              setSheet(null)
              setMessage('저장했습니다.')
            }
          }}
        />
      ) : null}
    </div>
  )
}

function TradeSheet({
  personId,
  holdingQty,
  sheet,
  saving,
  onClose,
  onSaving,
  onDone,
}: {
  personId: string
  holdingQty: number
  sheet: SheetState
  saving: boolean
  onClose: () => void
  onSaving: (value: boolean) => void
  onDone: (people: CoinPerson[], error?: string) => void
}) {
  const edit = sheet.edit
  const [side, setSide] = useState<CoinTradeSide>(sheet.side)
  const [symbol, setSymbol] = useState(sheet.symbol)
  const [coinName, setCoinName] = useState(sheet.coinName)
  const [query, setQuery] = useState('')
  const [markets, setMarkets] = useState<CoinMarket[]>([])
  const [tradedAt, setTradedAt] = useState(edit?.tradedAt ?? todayIso())
  const [qty, setQty] = useState(edit ? String(edit.qty) : '')
  const [unitPrice, setUnitPrice] = useState(edit ? String(edit.unitPrice) : '')
  const [fee, setFee] = useState(edit ? String(edit.fee || '') : '')
  const [amount, setAmount] = useState(edit ? String(edit.amount) : '')
  const [amountTouched, setAmountTouched] = useState(Boolean(edit))
  const [exchange, setExchange] = useState(edit?.exchange ?? 'upbit')
  const [memo, setMemo] = useState(edit?.memo ?? '')
  const [files, setFiles] = useState<CoinTradeFile[]>(edit?.files ?? [])
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const auto = num(qty) * num(unitPrice) + (side === 'buy' ? num(fee) : 0)
    if (!amountTouched && auto > 0) setAmount(String(Math.round(auto)))
  }, [qty, unitPrice, fee, side, amountTouched])

  useEffect(() => {
    if (sheet.lockCoin || query.trim().length < 1) {
      setMarkets([])
      return
    }
    const t = window.setTimeout(() => {
      void fetch(`/api/coins/markets?q=${encodeURIComponent(query)}`, { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => setMarkets(Array.isArray(data.markets) ? data.markets : []))
        .catch(() => undefined)
    }, 200)
    return () => window.clearTimeout(t)
  }, [query, sheet.lockCoin])

  async function addLocalFiles(list: FileList | File[] | null) {
    const incoming = [...(list ?? [])]
    if (!incoming.length) return
    const names = new Set(files.map((item) => item.name))
    const dupes = incoming.filter((file) => names.has(file.name))
    if (dupes.length) {
      const ok = window.confirm(`${dupes.map((file) => `「${file.name}」`).join(', ')} 같은 이름 파일이 이미 있습니다.\n이 파일로 바꿀까요?`)
      if (!ok) return
    }
    const next = await readFiles(incoming)
    setFiles((prev) => {
      const kept = prev.filter((item) => !next.some((file) => file.name === item.name))
      return [...kept, ...next].slice(0, MAX_TRADE_FILES)
    })
  }

  async function save() {
    if (!symbol) {
      onDone([], '코인을 고르세요.')
      return
    }
    onSaving(true)
    const res = await fetch(`/api/coins/${personId}/trades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: edit?.id,
        symbol,
        coinName,
        side,
        tradedAt,
        qty: num(qty),
        unitPrice: num(unitPrice),
        amount: num(amount),
        fee: num(fee),
        exchange,
        memo,
        files,
      }),
    })
    const data = await res.json().catch(() => ({}))
    onSaving(false)
    if (!res.ok) {
      onDone([], data.error || '저장하지 못했습니다.')
      return
    }
    onDone(Array.isArray(data.people) ? data.people : [])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#141418] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-white">{edit ? '거래 수정' : side === 'buy' ? '매수 추가' : '매도 추가'}</p>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-white/6 p-1">
          {(['buy', 'sell'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSide(item)}
              className={cn(
                'rounded-lg py-1.5 text-sm font-semibold',
                side === item ? (item === 'buy' ? 'bg-[#25a750] text-white' : 'bg-[#ca3f64] text-white') : 'text-white/50',
              )}
            >
              {item === 'buy' ? '매수' : '매도'}
            </button>
          ))}
        </div>

        {sheet.lockCoin ? (
          <p className="mb-3 text-sm font-semibold text-white">
            {coinName} <span className="text-white/40">{symbol}</span>
            {side === 'sell' ? <span className="ml-2 text-[11px] text-white/40">보유 {formatQty(holdingQty)}</span> : null}
          </p>
        ) : (
          <div className="relative mb-3">
            <input
              value={query || (symbol ? `${coinName} ${symbol}` : '')}
              onChange={(event) => {
                setQuery(event.target.value)
                setSymbol('')
              }}
              placeholder="코인 검색 (비트코인, BTC)"
              className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-gold"
            />
            {markets.length ? (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-white/10 bg-[#1a1a20] p-1">
                {markets.map((item) => (
                  <button
                    key={item.market}
                    type="button"
                    onClick={() => {
                      setSymbol(item.symbol)
                      setCoinName(item.name)
                      setQuery('')
                      setMarkets([])
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white/80 hover:bg-white/8"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl(item.symbol)} alt="" className="h-5 w-5 rounded-full" />
                    {item.name}
                    <span className="text-white/35">{item.symbol}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-white/40">
            날짜
            <input
              type="date"
              value={tradedAt}
              onChange={(event) => setTradedAt(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
            />
          </label>
          <label className="text-[11px] text-white/40">
            거래소
            <select
              value={exchange}
              onChange={(event) => setExchange(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
            >
              {COIN_EXCHANGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-white/40">
            수량
            <input
              inputMode="decimal"
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
            />
          </label>
          <label className="text-[11px] text-white/40">
            단가
            <input
              inputMode="decimal"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
            />
          </label>
          <label className="text-[11px] text-white/40">
            수수료
            <input
              inputMode="decimal"
              value={fee}
              onChange={(event) => setFee(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
            />
          </label>
          <label className="text-[11px] text-white/40">
            투자금액
            <input
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmountTouched(true)
                setAmount(event.target.value)
              }}
              className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
            />
          </label>
        </div>

        <input
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="메모 (선택)"
          className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
        />

        <div
          className={cn('mt-2 rounded-xl border border-dashed px-3 py-3 text-center text-[11px]', dragging ? 'border-gold text-gold' : 'border-white/15 text-white/40')}
          onDragEnter={(event: DragEvent<HTMLDivElement>) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event: DragEvent<HTMLDivElement>) => {
            event.preventDefault()
            setDragging(false)
            void addLocalFiles(event.dataTransfer.files)
          }}
        >
          <button type="button" onClick={() => fileInput.current?.click()} className="text-white/70">
            첨부파일 드래그 또는 선택 ({files.length}/{MAX_TRADE_FILES})
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              void addLocalFiles(event.target.files)
              event.target.value = ''
            }}
          />
          {files.length ? (
            <ul className="mt-2 space-y-1 text-left">
              {files.map((file) => (
                <li key={file.id} className="flex items-center justify-between text-white/70">
                  <span className="truncate">{file.name}</span>
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((item) => item.id !== file.id))}>
                    빼기
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="mt-4 h-11 w-full rounded-xl bg-gold text-sm font-bold text-black disabled:opacity-50"
        >
          저장
        </button>
      </div>
    </div>
  )
}
