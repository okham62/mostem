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

function LivePrice({ price, change }: { price: number; change: number }) {
  const prev = useRef(price)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (!price || prev.current === price) {
      if (price) prev.current = price
      return
    }
    setFlash(price > prev.current ? 'up' : 'down')
    prev.current = price
    const id = window.setTimeout(() => setFlash(null), 800)
    return () => window.clearTimeout(id)
  }, [price])

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-2 py-1',
        flash === 'up' && 'coin-price-flash-up',
        flash === 'down' && 'coin-price-flash-down',
      )}
    >
      <span className="coin-live-dot h-2 w-2 rounded-full bg-[#25a750]" />
      <span className="text-[11px] font-semibold tracking-wide text-white/45">LIVE</span>
      <span key={price || 'empty'} className="coin-price-tick text-base font-bold text-white">
        {price ? formatKrw(price) : '불러오는 중'}
      </span>
      {price ? (
        <span className={cn('text-sm font-bold', change >= 0 ? 'text-[#25a750]' : 'text-[#ca3f64]')}>
          {formatPct(change)}
        </span>
      ) : null}
    </div>
  )
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
  const [openSymbol, setOpenSymbol] = useState(initial[0] ? '' : '')
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const person = people.find((item) => item.id === personId) ?? people[0]
  const holdings = useMemo(() => holdingsFromTrades(person?.trades ?? []), [person])
  const selected = holdings.find((item) => item.symbol === openSymbol) ?? holdings[0]
  const symbolKey = holdings.map((item) => item.symbol).join(',')

  useEffect(() => {
    if (!holdings.length) {
      setOpenSymbol('')
      return
    }
    if (!holdings.some((item) => item.symbol === openSymbol)) {
      setOpenSymbol(holdings[0].symbol)
    }
  }, [personId, symbolKey, holdings, openSymbol])

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

  function mergePerson(next: CoinPerson) {
    setPeople((prev) => {
      const has = prev.some((item) => item.id === next.id)
      return has ? prev.map((item) => (item.id === next.id ? next : item)) : [...prev, next]
    })
  }

  function patchTrade(targetId: string, trade: CoinTrade) {
    setPeople((prev) =>
      prev.map((item) => {
        if (item.id !== targetId) return item
        const trades = item.trades.some((row) => row.id === trade.id)
          ? item.trades.map((row) => (row.id === trade.id ? { ...row, ...trade } : row))
          : [...item.trades, trade]
        return { ...item, trades }
      }),
    )
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
    const snapshot = people
    setPeople((prev) =>
      prev.map((item) =>
        item.id === person.id ? { ...item, trades: item.trades.filter((row) => row.id !== trade.id) } : item,
      ),
    )
    const res = await fetch(`/api/coins/${person.id}/trades/${trade.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setPeople(snapshot)
      setMessage(data.error || '삭제하지 못했습니다.')
      return
    }
    if (data.person) mergePerson(data.person)
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

      {holdings.length ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#16161b]">
            {holdings.map((item) => {
              const quote = prices[item.symbol]
              const price = quote?.krw ?? 0
              const value = item.qty * price
              const pnl = value - item.principal
              const pct = item.principal > 0 ? (pnl / item.principal) * 100 : 0
              const active = selected?.symbol === item.symbol
              return (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => setOpenSymbol(item.symbol)}
                  className={cn(
                    'flex w-full items-center gap-3 border-t border-white/6 px-4 py-3 text-left first:border-t-0',
                    active ? 'bg-gold/10' : 'hover:bg-white/4',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl(item.symbol)} alt="" className="h-8 w-8 rounded-full bg-white/5 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {item.coinName} <span className="text-white/35">{item.symbol}</span>
                    </p>
                    <p className="text-[11px] text-white/40">{formatQty(item.qty)}개 · 평단 {formatKrw(item.avg)}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-[11px] text-white/40">현재가</p>
                    <p className="text-xs font-semibold text-white">{price ? formatKrw(price) : '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{price ? formatKrw(value) : '-'}</p>
                    <p className={cn('text-[11px] font-semibold', pnl >= 0 ? 'text-[#25a750]' : 'text-[#ca3f64]')}>
                      {formatPct(pct)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {selected ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#16161b]">
              <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl(selected.symbol)} alt="" className="h-10 w-10 rounded-full bg-white/5 object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-white">
                        {selected.coinName} <span className="text-white/35">{selected.symbol}</span>
                      </p>
                      <LivePrice price={prices[selected.symbol]?.krw ?? 0} change={prices[selected.symbol]?.change ?? 0} />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white/6 px-3 py-2">
                      <p className="text-[11px] font-semibold text-white/45">최종 수량</p>
                      <p className="mt-0.5 text-sm font-bold text-white">{formatQty(selected.qty)}</p>
                    </div>
                    <div className="rounded-xl bg-white/6 px-3 py-2">
                      <p className="text-[11px] font-semibold text-white/45">최종 평단</p>
                      <p className="mt-0.5 text-sm font-bold text-white">{formatKrw(selected.avg)}</p>
                    </div>
                    <div className="rounded-xl bg-white/6 px-3 py-2">
                      <p className="text-[11px] font-semibold text-white/45">최종 원금</p>
                      <p className="mt-0.5 text-sm font-bold text-white">{formatKrw(selected.principal)}</p>
                    </div>
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs font-semibold text-white/40">평가금액</p>
                  <p className="mt-0.5 text-3xl font-bold tracking-tight text-white">
                    {prices[selected.symbol]?.krw ? formatKrw(selected.qty * prices[selected.symbol].krw) : '시세 없음'}
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-base font-bold',
                      selected.qty * (prices[selected.symbol]?.krw ?? 0) - selected.principal >= 0
                        ? 'text-[#25a750]'
                        : 'text-[#ca3f64]',
                    )}
                  >
                    {formatKrw(selected.qty * (prices[selected.symbol]?.krw ?? 0) - selected.principal)}{' '}
                    {formatPct(
                      selected.principal > 0
                        ? ((selected.qty * (prices[selected.symbol]?.krw ?? 0) - selected.principal) / selected.principal) * 100
                        : 0,
                    )}
                  </p>
                  <div className="mt-3 flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setSheet({ side: 'buy', symbol: selected.symbol, coinName: selected.coinName, lockCoin: true })
                      }
                      className="rounded-lg bg-[#25a750]/20 px-3 py-1.5 text-xs font-semibold text-[#25a750]"
                    >
                      매수
                    </button>
                    <button
                      type="button"
                      disabled={selected.qty <= 0}
                      onClick={() =>
                        setSheet({ side: 'sell', symbol: selected.symbol, coinName: selected.coinName, lockCoin: true })
                      }
                      className="rounded-lg bg-[#ca3f64]/20 px-3 py-1.5 text-xs font-semibold text-[#ca3f64] disabled:opacity-30"
                    >
                      매도
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto border-t border-white/8">
                <table className="w-full min-w-[720px] text-left text-[11px]">
                  <thead className="text-white/35">
                    <tr>
                      <th className="px-3 py-2 font-medium">날짜</th>
                      <th className="px-3 py-2 font-medium">수량</th>
                      <th className="px-3 py-2 font-medium">평단</th>
                      <th className="px-3 py-2 font-medium">투자금</th>
                      <th className="px-3 py-2 font-medium">누적수량</th>
                      <th className="px-3 py-2 font-medium">누적원금</th>
                      <th className="px-3 py-2 font-medium">최종평단</th>
                      <th className="px-3 py-2 font-medium">메모</th>
                      <th className="px-3 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {runningLedger(selected.trades).map((row) => (
                      <tr key={row.trade.id} className="border-t border-white/5 text-white/75 hover:bg-white/4">
                        <td className="whitespace-nowrap px-3 py-2 text-white/45">{row.trade.tradedAt}</td>
                        <td className={cn('px-3 py-2 font-semibold', row.signedQty >= 0 ? 'text-[#25a750]' : 'text-[#ca3f64]')}>
                          {formatSignedQty(row.signedQty)}
                        </td>
                        <td className="px-3 py-2 text-white">{formatKrw(row.trade.unitPrice)}</td>
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
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/12 px-4 py-10 text-center text-sm text-white/40">
          아직 거래가 없습니다. 코인 추가나 매수로 한 줄만 넣으면 평단이 생깁니다.
        </div>
      )}

      {message ? <p className="text-xs text-gold">{message}</p> : null}

      {sheet && person ? (
        <TradeSheet
          holdingQty={holdings.find((item) => item.symbol === sheet.symbol)?.qty ?? 0}
          sheet={sheet}
          onClose={() => setSheet(null)}
          onSubmit={(trade, uploaded) => {
            const snapshot = people
            patchTrade(person.id, {
              ...trade,
              files: trade.files.map((file) => ({
                id: file.id,
                name: file.name,
                mime: file.mime,
                size: file.size,
              })),
            })
            setOpenSymbol(trade.symbol)
            setSheet(null)
            setMessage('저장했습니다.')
            void fetch(`/api/coins/${person.id}/trades`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...trade,
                files: uploaded.some((file) => file.data) ? uploaded : undefined,
              }),
            })
              .then(async (res) => {
                const data = await res.json().catch(() => ({}))
                if (!res.ok) {
                  setPeople(snapshot)
                  setMessage(data.error || '저장하지 못했습니다.')
                  return
                }
                if (data.person) mergePerson(data.person)
              })
              .catch(() => {
                setPeople(snapshot)
                setMessage('저장하지 못했습니다.')
              })
          }}
        />
      ) : null}
    </div>
  )
}

function TradeSheet({
  holdingQty,
  sheet,
  onClose,
  onSubmit,
}: {
  holdingQty: number
  sheet: SheetState
  onClose: () => void
  onSubmit: (trade: CoinTrade, files: CoinTradeFile[]) => void
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
  const [hint, setHint] = useState('')
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

  function save() {
    if (!symbol) {
      setHint('코인을 고르세요.')
      return
    }
    onSubmit(
      {
        id: edit?.id || (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`),
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
        createdAt: edit?.createdAt ?? new Date().toISOString(),
      },
      files,
    )
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

        {hint ? <p className="mt-2 text-xs text-gold">{hint}</p> : null}
        <button
          type="button"
          onClick={save}
          className="mt-4 h-11 w-full rounded-xl bg-gold text-sm font-bold text-black"
        >
          저장
        </button>
      </div>
    </div>
  )
}
