'use client'

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { ChevronDown, Paperclip, Plus, X } from 'lucide-react'
import {
  COIN_EXCHANGES,
  MAX_TRADE_FILE_BYTES,
  MAX_TRADE_FILES,
  exchangeLabel,
  exchangeLogo,
  formatKrw,
  formatPct,
  formatQty,
  formatSignedKrw,
  formatSignedQty,
  holdingsFromTrades,
  runningLedger,
  num,
  todayIso,
  tradeAmount,
  type CoinHolding,
  type CoinLedgerRow,
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

function ExchangeMark({ id, className }: { id: string; className?: string }) {
  const label = exchangeLabel(id)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={exchangeLogo(id)}
      alt={label}
      title={label}
      className={cn('h-6 w-6 rounded-md bg-white object-contain p-0.5', className)}
    />
  )
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
        'inline-flex max-w-full flex-nowrap items-center gap-1',
        flash === 'up' && 'coin-price-flash-up',
        flash === 'down' && 'coin-price-flash-down',
      )}
    >
      <span className="coin-live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#25a750]" />
      <span key={price || 'empty'} className="coin-price-tick whitespace-nowrap text-[13px] font-bold text-white sm:text-sm">
        {price ? formatKrw(price) : '시세 확인 중'}
      </span>
      {price ? (
        <span className={cn('whitespace-nowrap text-[12px] font-bold', change >= 0 ? 'text-[#25a750]' : 'text-[#ca3f64]')}>
          {formatPct(change)}
        </span>
      ) : null}
    </div>
  )
}

function formatKrwShort(value: number) {
  const abs = Math.abs(value)
  if (abs >= 100_000_000) return `${(value / 100_000_000).toFixed(2).replace(/\.?0+$/, '')}억`
  if (abs >= 10_000_000) return `${Math.round(value / 10_000)}만`
  return formatKrw(value)
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

export function CoinsClient({ initial, initialPrices }: { initial: CoinPerson[]; initialPrices: CoinPriceMap }) {
  const [people, setPeople] = useState(initial)
  const [personId, setPersonId] = useState(initial[0]?.id ?? '')
  const [prices, setPrices] = useState<CoinPriceMap>(initialPrices)
  const [openSymbol, setOpenSymbol] = useState('')
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const person = people.find((item) => item.id === personId) ?? people[0]
  const holdings = useMemo(() => holdingsFromTrades(person?.trades ?? []), [person])
  const symbolKey = holdings.map((item) => item.symbol).join(',')

  useEffect(() => {
    setOpenSymbol('')
  }, [personId])

  useEffect(() => {
    if (openSymbol && !holdings.some((item) => item.symbol === openSymbol)) {
      setOpenSymbol('')
    }
  }, [openSymbol, symbolKey, holdings])

  useEffect(() => {
    const symbols = symbolKey ? symbolKey.split(',') : []
    if (!symbols.length) return
    const ctrl = new AbortController()
    const load = () => {
      void fetch(`/api/coins/markets?symbols=${symbols.join(',')}`, { cache: 'no-store', signal: ctrl.signal })
        .then((res) => res.json())
        .then((data) => {
          if (data.prices) setPrices((prev) => ({ ...prev, ...data.prices }))
        })
        .catch(() => undefined)
    }
    const missing = symbols.some((symbol) => !initialPrices[symbol]?.krw)
    if (missing) load()
    const id = window.setInterval(load, 20000)
    return () => {
      ctrl.abort()
      window.clearInterval(id)
    }
  }, [symbolKey])

  const totals = holdings.reduce(
    (acc, item) => {
      const price = prices[item.symbol]?.krw
      acc.principal += item.principal
      acc.realized += item.realized
      if (!price) return acc
      const value = item.qty * price
      acc.value += value
      acc.unrealized += value - item.principal
      acc.priced += 1
      return acc
    },
    { value: 0, principal: 0, realized: 0, unrealized: 0, priced: 0 },
  )
  const pricesReady = holdings.length === 0 || totals.priced === holdings.length
  const totalPnl = totals.unrealized + totals.realized
  const totalPct = totals.principal > 0 && pricesReady ? (totals.unrealized / totals.principal) * 100 : 0

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
    const name = window.prompt('장부 이름 (예: 업비트, 임옥환)')
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
      setMessage(data.error || '장부를 만들지 못했습니다.')
      return
    }
    if (Array.isArray(data.people)) applyPeople(data.people)
    if (data.person?.id) setPersonId(data.person.id)
  }

  async function removePerson() {
    if (!person) return
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
    <div className="mx-auto w-full max-w-[960px] space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold text-white sm:text-2xl">코인 장부</h1>
          <p className="mt-1 hidden text-sm text-white/45 sm:block">거래소별·대상별로 나눠 두고, 평단과 총자산이 자동으로 맞춰집니다.</p>
        </div>
        <button
          type="button"
          disabled={saving || !person}
          onClick={() => setSheet({ side: 'buy', symbol: '', coinName: '', lockCoin: false })}
          className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl bg-gold px-3 text-[15px] font-semibold text-black disabled:opacity-40 sm:h-auto sm:w-auto sm:py-2 sm:text-sm"
        >
          <Plus className="h-4 w-4" />
          코인 추가
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {people.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPersonId(item.id)}
              className={cn(
                'rounded-full px-3.5 py-2 text-[15px] font-semibold sm:py-1.5 sm:text-sm',
                item.id === person?.id ? 'bg-gold text-black' : 'bg-white/8 text-white/70 hover:bg-white/12',
              )}
            >
              {item.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void addPerson()}
            className="rounded-full border border-dashed border-white/20 px-3.5 py-2 text-[15px] text-white/50 hover:text-white sm:py-1.5 sm:text-sm"
          >
            + 장부
          </button>
        </div>
        {person ? (
          <button type="button" onClick={() => void removePerson()} className="text-sm text-white/40 hover:text-red-300">
            이 장부 삭제
          </button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#141418] p-4 sm:p-5">
        <p className="text-sm font-semibold text-white/50">총 자산</p>
        <p className="mt-1 break-keep text-[28px] font-bold leading-tight tracking-tight text-white sm:text-3xl">
          {pricesReady ? formatKrw(totals.value) : '시세 확인 중'}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-1.5 text-[15px] sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-1 sm:text-sm">
          <span className="text-white/50">
            원금 <b className="ml-1 font-semibold text-white">{formatKrw(totals.principal)}</b>
          </span>
          {pricesReady ? (
            <span className={totalPnl >= 0 ? 'text-[#25a750]' : 'text-[#ca3f64]'}>
              평가손익 <b className="ml-1">{formatKrw(totals.unrealized)}</b> {formatPct(totalPct)}
            </span>
          ) : null}
          <span className="text-white/50">
            실현손익 <b className="ml-1 text-white">{formatKrw(totals.realized)}</b>
          </span>
        </div>
      </div>

      {holdings.length ? (
        <div className="space-y-3">
          {holdings.map((item) => {
            const open = openSymbol === item.symbol
            return (
              <div
                key={item.symbol}
                className={cn('overflow-hidden rounded-2xl border bg-[#16161b]', open ? 'border-gold/30' : 'border-white/10')}
              >
                <CoinCard
                  item={item}
                  prices={prices}
                  open={open}
                  onToggle={() => setOpenSymbol(open ? '' : item.symbol)}
                  onBuy={() => setSheet({ side: 'buy', symbol: item.symbol, coinName: item.coinName, lockCoin: true })}
                  onSell={() => setSheet({ side: 'sell', symbol: item.symbol, coinName: item.coinName, lockCoin: true })}
                />
                {open ? (
                  <TradeHistory
                    item={item}
                    onEdit={(trade) =>
                      setSheet({
                        side: trade.side,
                        symbol: trade.symbol,
                        coinName: trade.coinName,
                        lockCoin: true,
                        edit: trade,
                      })
                    }
                    onRemove={(trade) => void removeTrade(trade)}
                    onOpenFile={(trade, file) => void openFile(trade, file)}
                  />
                ) : null}
              </div>
            )
          })}
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

function CoinCard({
  item,
  prices,
  open,
  onToggle,
  onBuy,
  onSell,
}: {
  item: CoinHolding
  prices: CoinPriceMap
  open: boolean
  onToggle: () => void
  onBuy: () => void
  onSell: () => void
}) {
  const quote = prices[item.symbol]
  const price = quote?.krw ?? 0
  const ready = Boolean(quote?.krw)
  const value = ready ? item.qty * price : 0
  const pnl = ready ? value - item.principal : 0
  const pct = ready && item.principal > 0 ? (pnl / item.principal) * 100 : 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onToggle()
        }
      }}
      className={cn('cursor-pointer px-3 py-3 text-left sm:px-4', open ? 'bg-gold/5' : 'hover:bg-white/3')}
    >
      <div className="flex items-start gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl(item.symbol)} alt="" className="mt-0.5 h-9 w-9 shrink-0 rounded-full bg-white/5 object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-white">
            {item.coinName} <span className="font-semibold text-white/35">{item.symbol}</span>
          </p>
          <LivePrice price={price} change={quote?.change ?? 0} />
        </div>
        <div className="shrink-0 text-right">
          <p className="whitespace-nowrap text-[17px] font-bold leading-tight text-white">
            {ready ? formatKrw(value) : '시세 확인 중'}
          </p>
          {ready ? (
            <p className={cn('mt-0.5 text-[13px] font-bold', pnl >= 0 ? 'text-[#25a750]' : 'text-[#ca3f64]')}>
              {formatPct(pct)} <span className="font-semibold opacity-80">{formatKrw(pnl)}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-xl bg-white/[0.04]">
        {[
          { label: '수량', value: formatQty(item.qty), tone: 'border-white/35 text-white' },
          { label: '평단', value: formatKrw(item.avg), tone: 'border-gold text-gold' },
          { label: '원금', value: formatKrwShort(item.principal), tone: 'border-sky-300/70 text-sky-200', title: formatKrw(item.principal) },
        ].map((stat, index) => (
          <div
            key={stat.label}
            title={stat.title}
            className={cn('border-t-2 px-2 py-2 text-center', stat.tone, index > 0 && 'border-l border-l-white/10')}
          >
            <p className="text-[15px] font-bold leading-tight tracking-tight">{stat.value}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-white/40">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onBuy()
          }}
          className="rounded-lg bg-[#25a750]/15 px-3 py-1.5 text-[13px] font-bold text-[#25a750]"
        >
          매수
        </button>
        <button
          type="button"
          disabled={item.qty <= 0}
          onClick={(event) => {
            event.stopPropagation()
            onSell()
          }}
          className="rounded-lg bg-[#ca3f64]/15 px-3 py-1.5 text-[13px] font-bold text-[#ca3f64] disabled:opacity-30"
        >
          매도
        </button>
      </div>
    </div>
  )
}

function monthKey(date: string) {
  return date.slice(0, 7)
}

function monthLabel(key: string) {
  const [year, month] = key.split('-')
  return `${year}년 ${Number(month)}월`
}

function groupLedgerByMonth(rows: CoinLedgerRow[]) {
  const groups = new Map<string, CoinLedgerRow[]>()
  for (const row of rows) {
    const key = monthKey(row.trade.tradedAt)
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a))
}

function TradeHistory({
  item,
  onEdit,
  onRemove,
  onOpenFile,
}: {
  item: CoinHolding
  onEdit: (trade: CoinTrade) => void
  onRemove: (trade: CoinTrade) => void
  onOpenFile: (trade: CoinTrade, file: CoinTradeFile) => void
}) {
  const rows = useMemo(() => runningLedger(item.trades), [item.trades])
  const groups = useMemo(() => groupLedgerByMonth(rows), [rows])
  const latest = groups[0]?.[0] ?? ''
  const [openMonths, setOpenMonths] = useState<string[]>(latest ? [latest] : [])

  useEffect(() => {
    setOpenMonths((prev) => (prev.includes(latest) || !latest ? prev : [latest, ...prev]))
  }, [latest])

  function toggleMonth(key: string) {
    setOpenMonths((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]))
  }

  return (
    <div className="border-t border-white/8 bg-black/20">
      {groups.length > 1 ? (
        <div className="flex items-center justify-between px-3 py-2 sm:px-4">
          <p className="text-xs text-white/40">최근 달만 열어 두었습니다. 이전 달은 눌러서 보세요.</p>
          <button
            type="button"
            className="text-xs text-white/50 hover:text-white"
            onClick={() =>
              setOpenMonths((prev) => (prev.length === groups.length ? [latest] : groups.map(([key]) => key)))
            }
          >
            {openMonths.length === groups.length ? '최근 달만' : '전체 펼치기'}
          </button>
        </div>
      ) : null}
      <div className="space-y-1 px-3 py-3 sm:hidden">
        {groups.map(([key, monthRows]) => {
          const open = openMonths.includes(key) || groups.length === 1
          const last = monthRows[monthRows.length - 1]
          return (
            <div key={key}>
              {groups.length > 1 ? (
                <button
                  type="button"
                  onClick={() => toggleMonth(key)}
                  className="mb-2 flex w-full items-center justify-between rounded-xl bg-white/8 px-3 py-3 text-left"
                >
                  <span className="text-[15px] font-bold text-white">{monthLabel(key)}</span>
                  <span className="flex items-center gap-2 text-sm text-white/50">
                    {monthRows.length}건 · 누적 {formatQty(last.afterQty)}
                    <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
                  </span>
                </button>
              ) : null}
              {open
                ? monthRows.map((row) => (
                    <div key={row.trade.id} className="mb-2 rounded-xl bg-white/6 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-white/50">{row.trade.tradedAt}</p>
                        <ExchangeMark id={row.trade.exchange} />
                      </div>
                      <div className="mt-1.5 flex items-baseline justify-between gap-3">
                        <span className={cn('text-[17px] font-bold', row.signedQty >= 0 ? 'text-[#25a750]' : 'text-[#ca3f64]')}>
                          {formatSignedQty(row.signedQty)}개
                        </span>
                        <span className={cn('text-[15px] font-bold', row.signedAmount >= 0 ? 'text-[#25a750]' : 'text-[#ca3f64]')}>
                          {formatSignedKrw(row.signedAmount)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-white/60">
                        평단 {formatKrw(row.trade.unitPrice)} · 누적 {formatQty(row.afterQty)} · {formatKrw(row.afterAvg)}
                      </p>
                      {row.trade.memo ? <p className="mt-1 text-sm text-white/45">{row.trade.memo}</p> : null}
                      {row.trade.files.length ? (
                        <div className="mt-1 flex flex-wrap gap-2 text-sm text-white/55">
                          {row.trade.files.map((file) => (
                            <button key={file.id} type="button" className="underline" onClick={() => onOpenFile(row.trade, file)}>
                              {file.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-2 flex gap-4 text-[15px]">
                        <button type="button" className="text-white/60" onClick={() => onEdit(row.trade)}>
                          수정
                        </button>
                        <button type="button" className="text-red-300/80" onClick={() => onRemove(row.trade)}>
                          삭제
                        </button>
                      </div>
                    </div>
                  ))
                : null}
            </div>
          )
        })}
      </div>
      <div className="hidden sm:block">
        {groups.map(([key, monthRows]) => {
          const open = openMonths.includes(key) || groups.length === 1
          const last = monthRows[monthRows.length - 1]
          return (
            <div key={key}>
              {groups.length > 1 ? (
                <button
                  type="button"
                  onClick={() => toggleMonth(key)}
                  className="flex w-full items-center justify-between border-t border-white/8 px-4 py-2.5 text-left hover:bg-white/4"
                >
                  <span className="text-sm font-bold text-white">{monthLabel(key)}</span>
                  <span className="flex items-center gap-2 text-xs text-white/45">
                    {monthRows.length}건 · 누적 {formatQty(last.afterQty)} · 평단 {formatKrw(last.afterAvg)}
                    <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
                  </span>
                </button>
              ) : null}
              {open ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-[13px]">
                    <thead className="text-white/40">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">날짜</th>
                        <th className="px-3 py-2.5 font-medium">수량</th>
                        <th className="px-3 py-2.5 font-medium">평단</th>
                        <th className="px-3 py-2.5 font-medium">투자금</th>
                        <th className="px-3 py-2.5 font-medium">누적수량</th>
                        <th className="px-3 py-2.5 font-medium">누적원금</th>
                        <th className="px-3 py-2.5 font-medium">최종평단</th>
                        <th className="px-3 py-2.5 font-medium">메모</th>
                        <th className="px-3 py-2.5 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRows.map((row) => (
                        <tr key={row.trade.id} className="border-t border-white/5 text-white/80 hover:bg-white/4">
                          <td className="whitespace-nowrap px-3 py-2.5 text-white/50">{row.trade.tradedAt}</td>
                          <td className={cn('px-3 py-2.5 font-semibold', row.signedQty >= 0 ? 'text-[#25a750]' : 'text-[#ca3f64]')}>
                            {formatSignedQty(row.signedQty)}
                          </td>
                          <td className="px-3 py-2.5 text-white">{formatKrw(row.trade.unitPrice)}</td>
                          <td className={cn('px-3 py-2.5 font-semibold', row.signedAmount >= 0 ? 'text-[#25a750]' : 'text-[#ca3f64]')}>
                            {formatSignedKrw(row.signedAmount)}
                          </td>
                          <td className="px-3 py-2.5">{formatQty(row.afterQty)}</td>
                          <td className="px-3 py-2.5">{formatKrw(row.afterPrincipal)}</td>
                          <td className="px-3 py-2.5 font-semibold text-white">{formatKrw(row.afterAvg)}</td>
                          <td className="max-w-[180px] truncate px-3 py-2.5 text-white/55" title={row.trade.memo}>
                            {row.trade.memo || '—'}
                            {row.trade.files.length ? (
                              <span className="ml-1 inline-flex items-center gap-1">
                                <Paperclip className="h-3.5 w-3.5" />
                                {row.trade.files.map((file) => (
                                  <button key={file.id} type="button" className="underline" onClick={() => onOpenFile(row.trade, file)}>
                                    {file.name}
                                  </button>
                                ))}
                              </span>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right">
                            <ExchangeMark id={row.trade.exchange} className="inline-block align-middle" />
                            <button type="button" className="ml-2 text-white/40 hover:text-white" onClick={() => onEdit(row.trade)}>
                              수정
                            </button>
                            <button type="button" className="ml-2 text-white/30 hover:text-red-300" onClick={() => onRemove(row.trade)}>
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
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
  const [amountTouched, setAmountTouched] = useState(false)
  const [exchange, setExchange] = useState(edit?.exchange ?? 'upbit')
  const [memo, setMemo] = useState(edit?.memo ?? '')
  const [files, setFiles] = useState<CoinTradeFile[]>(edit?.files ?? [])
  const [dragging, setDragging] = useState(false)
  const [hint, setHint] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const auto = tradeAmount(num(qty), num(unitPrice), num(fee), side)
    if (!amountTouched && auto > 0) setAmount(String(auto))
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
        amount: amountTouched ? num(amount) : tradeAmount(num(qty), num(unitPrice), num(fee), side),
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
      <div className="max-h-[90dvh] w-full max-w-[420px] overflow-y-auto rounded-2xl border border-white/10 bg-[#141418] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-bold text-white">{edit ? '거래 수정' : side === 'buy' ? '매수 추가' : '매도 추가'}</p>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-white/6 p-1">
          {(['buy', 'sell'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSide(item)}
              className={cn(
                'rounded-lg py-2.5 text-[15px] font-semibold',
                side === item ? (item === 'buy' ? 'bg-[#25a750] text-white' : 'bg-[#ca3f64] text-white') : 'text-white/50',
              )}
            >
              {item === 'buy' ? '매수' : '매도'}
            </button>
          ))}
        </div>

        {sheet.lockCoin ? (
          <p className="mb-3 text-[15px] font-semibold text-white">
            {coinName} <span className="text-white/40">{symbol}</span>
            {side === 'sell' ? <span className="ml-2 text-sm text-white/40">보유 {formatQty(holdingQty)}</span> : null}
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

        <div className="mb-2 text-sm text-white/50">
          거래소
          <div className="mt-1 flex flex-wrap gap-1.5">
            {COIN_EXCHANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => setExchange(item.id)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl border',
                  exchange === item.id ? 'border-gold bg-white' : 'border-white/10 bg-white/90 hover:bg-white',
                )}
              >
                <ExchangeMark id={item.id} className="h-7 w-7 bg-transparent p-0" />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="col-span-2 text-sm text-white/50">
            날짜
            <input
              type="date"
              value={tradedAt}
              onChange={(event) => setTradedAt(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-[15px] text-white outline-none"
            />
          </label>
          <label className="text-sm text-white/50">
            수량
            <input
              inputMode="decimal"
              value={qty}
              onChange={(event) => {
                setAmountTouched(false)
                setQty(event.target.value)
              }}
              className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-[15px] text-white outline-none"
            />
          </label>
          <label className="text-sm text-white/50">
            단가
            <input
              inputMode="decimal"
              value={unitPrice}
              onChange={(event) => {
                setAmountTouched(false)
                setUnitPrice(event.target.value)
              }}
              className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-[15px] text-white outline-none"
            />
          </label>
          <label className="text-sm text-white/50">
            수수료
            <input
              inputMode="decimal"
              value={fee}
              onChange={(event) => {
                setAmountTouched(false)
                setFee(event.target.value)
              }}
              className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-[15px] text-white outline-none"
            />
          </label>
          <label className="text-sm text-white/50">
            투자금액
            <input
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmountTouched(true)
                setAmount(event.target.value)
              }}
              className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-[15px] text-white outline-none"
            />
          </label>
        </div>

        <input
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="메모 (선택)"
          className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-[15px] text-white outline-none"
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
          className="mt-4 h-12 w-full rounded-xl bg-gold text-[15px] font-bold text-black"
        >
          저장
        </button>
      </div>
    </div>
  )
}
