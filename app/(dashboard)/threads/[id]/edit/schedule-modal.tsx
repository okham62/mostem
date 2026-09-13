'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ConnectedAccount } from '@/types'

const QUICK = [
  [10, '10분'],
  [30, '30분'],
  [60, '1시간'],
  [120, '2시간'],
  [180, '3시간'],
] as const

const HOUR_PRESETS = [
  [9, '오전 9시'],
  [12, '낮 12시'],
  [15, '오후 3시'],
  [18, '저녁 6시'],
  [21, '밤 9시'],
] as const

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function startOfDay(value: Date) {
  const next = new Date(value)
  next.setHours(0, 0, 0, 0)
  return next
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function upcomingDays(count = 7) {
  const today = startOfDay(new Date())
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(today)
    day.setDate(today.getDate() + index)
    return day
  })
}

function withDate(base: Date, day: Date) {
  const next = new Date(base)
  next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate())
  return next
}

function withTime(base: Date, hours: number, minutes: number) {
  const next = new Date(base)
  next.setHours(hours, minutes, 0, 0)
  return next
}

function clampFuture(value: Date) {
  const min = Date.now() + 60_000
  return value.getTime() < min ? new Date(Date.now() + 10 * 60_000) : value
}

function dateInputValue(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

function dayChipLabel(day: Date, index: number) {
  if (index === 0) return '오늘'
  if (index === 1) return '내일'
  return day.toLocaleDateString('ko-KR', { weekday: 'short' })
}

function Stepper({
  value,
  label,
  onStep,
}: {
  value: number
  label: string
  onStep: (delta: number) => void
}) {
  return (
    <div className="flex min-w-[64px] flex-col items-center">
      <button
        type="button"
        onClick={() => onStep(1)}
        className="flex h-6 w-full items-center justify-center rounded-lg text-[10px] text-white/45 hover:bg-white/8 hover:text-white"
        aria-label={`${label} 올리기`}
      >
        ▲
      </button>
      <p
        key={`${label}-${value}`}
        className="animate-schedule-tick text-[28px] font-bold leading-none tabular-nums text-white"
      >
        {pad(value)}
      </p>
      <button
        type="button"
        onClick={() => onStep(-1)}
        className="flex h-6 w-full items-center justify-center rounded-lg text-[10px] text-white/45 hover:bg-white/8 hover:text-white"
        aria-label={`${label} 내리기`}
      >
        ▼
      </button>
    </div>
  )
}

export function ScheduleModal({
  account,
  saving,
  feedback,
  initialAt,
  onClose,
  onConfirm,
}: {
  account?: ConnectedAccount
  saving: boolean
  feedback?: string
  initialAt: Date
  onClose: () => void
  onConfirm: (when: Date) => void | Promise<void>
}) {
  const [mounted, setMounted] = useState(false)
  const [when, setWhen] = useState(() => clampFuture(initialAt))
  const [quickMins, setQuickMins] = useState<number | null>(10)
  const [busy, setBusy] = useState(false)
  const days = useMemo(() => upcomingDays(7), [])
  const working = saving || busy

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !working) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, working])

  async function confirm() {
    if (working || !account) return
    setBusy(true)
    try {
      await onConfirm(clampFuture(when))
    } finally {
      setBusy(false)
    }
  }

  function setCustom(next: Date) {
    setWhen(clampFuture(next))
    setQuickMins(null)
  }

  function pickQuick(mins: number) {
    setQuickMins(mins)
    setWhen(new Date(Date.now() + mins * 60 * 1000))
  }

  const selectedDay = days.find((day) => sameDay(day, when))
  const laterDate = !selectedDay
  const meridiem = when.getHours() < 12 ? '오전' : '오후'
  const relative = (() => {
    const diff = when.getTime() - Date.now()
    if (diff < 60_000) return '곧'
    const mins = Math.round(diff / 60_000)
    if (mins < 60) return `${mins}분 뒤`
    const hours = Math.floor(mins / 60)
    const rest = mins % 60
    if (hours < 24) return rest ? `${hours}시간 ${rest}분 뒤` : `${hours}시간 뒤`
    return `${Math.floor(hours / 24)}일 뒤`
  })()

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-3 backdrop-blur-[2px] animate-schedule-backdrop-in"
      onClick={() => {
        if (!working) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-title"
        className="flex max-h-[min(96vh,720px)] w-full max-w-[400px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141418] p-3.5 shadow-[0_24px_80px_rgba(0,0,0,0.55)] animate-schedule-card-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 id="schedule-title" className="text-[15px] font-bold text-white">
            예약 발행
          </h2>
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-white/5 px-2 py-1">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold">
              {(account?.username?.[0] ?? '나').toUpperCase()}
            </div>
            <p className="truncate text-[11px] text-white/70">@{account?.username ?? '미선택'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={working}
            className="rounded-lg px-1 text-white/40 hover:text-white disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="mb-2 rounded-xl bg-gradient-to-br from-white/10 to-white/[0.03] px-3 py-2 ring-1 ring-white/10">
          <p
            key={when.toISOString()}
            className="animate-schedule-tick text-[17px] font-bold leading-snug tracking-tight text-white"
          >
            {when.toLocaleDateString('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}{' '}
            {meridiem} {when.getHours() % 12 || 12}:{pad(when.getMinutes())}
            <span className="ml-2 text-[12px] font-semibold text-gold">{relative}</span>
          </p>
        </div>

        <div className="mb-2 flex flex-wrap gap-1">
          {QUICK.map(([mins, label]) => (
            <button
              key={mins}
              type="button"
              onClick={() => pickQuick(mins)}
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                quickMins === mins ? 'bg-white text-black' : 'bg-white/8 text-white/80 hover:bg-white/12'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-1.5 grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const selected = Boolean(selectedDay && sameDay(day, when))
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setCustom(withDate(when, day))}
                className={`flex flex-col items-center rounded-lg px-0.5 py-1 ${
                  selected ? 'bg-white text-black' : 'bg-white/6 text-white/75 hover:bg-white/10'
                }`}
              >
                <span className={`text-[9px] ${selected ? 'text-black/50' : 'text-white/40'}`}>
                  {dayChipLabel(day, index)}
                </span>
                <span className="text-[12px] font-bold tabular-nums">{day.getDate()}</span>
              </button>
            )
          })}
        </div>
        <label
          className={`mb-2 flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-[11px] ${
            laterDate ? 'border-white/25 bg-white/8 text-white' : 'border-white/10 bg-black/20 text-white/55'
          }`}
        >
          <span>{laterDate ? '다른 날' : '더 나중 날짜'}</span>
          <input
            type="date"
            value={dateInputValue(when)}
            min={dateInputValue(new Date())}
            onChange={(event) => {
              if (!event.target.value) return
              const [year, month, day] = event.target.value.split('-').map(Number)
              setCustom(withDate(when, new Date(year, month - 1, day)))
            }}
            className="bg-transparent text-right text-[11px] text-white outline-none [color-scheme:dark]"
          />
        </label>

        <div className="mb-1.5 flex items-center justify-center gap-2 rounded-xl bg-black/30 px-2 py-1">
          <p className="w-8 text-center text-[12px] font-semibold text-white/50">{meridiem}</p>
          <Stepper
            value={when.getHours()}
            label="시"
            onStep={(delta) => setCustom(withTime(when, (when.getHours() + delta + 24) % 24, when.getMinutes()))}
          />
          <span className="text-2xl font-bold text-white/25">:</span>
          <Stepper
            value={when.getMinutes()}
            label="분"
            onStep={(delta) => {
              const next = new Date(when)
              next.setMinutes(when.getMinutes() + delta * 5)
              setCustom(next)
            }}
          />
        </div>
        <div className="mb-2 flex flex-wrap gap-1">
          {HOUR_PRESETS.map(([hour, label]) => (
            <button
              key={hour}
              type="button"
              onClick={() => setCustom(withTime(when, hour, 0))}
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                when.getHours() === hour && when.getMinutes() === 0 && quickMins == null
                  ? 'bg-brand text-white'
                  : 'bg-white/8 text-white/70 hover:bg-white/12'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] leading-snug text-white/65">
          <span className="font-semibold text-white">Threads 공식 예약</span>
          {' · '}
          PC 꺼둬도 시각에 발행 · 폰 알림은 Threads가 보내요 · 확인은 임시저장본
        </div>

        <div className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] leading-snug text-amber-200">
          확정 때만 하미 + Threads 로그인 필요 · Threads 실패 시 모스템에도 예약 안 됨
        </div>

        {feedback ? (
          <div
            className={`mb-2 rounded-lg px-2.5 py-1.5 text-[11px] leading-snug ${
              working
                ? 'border border-sky-400/30 bg-sky-500/10 text-sky-100'
                : 'border border-gold/40 bg-gold/10 text-gold'
            }`}
          >
            {feedback}
          </div>
        ) : null}

        <button
          type="button"
          disabled={working || !account}
          onClick={() => void confirm()}
          className="mt-auto w-full rounded-xl bg-gold py-2.5 text-[13px] font-bold text-black hover:brightness-110 disabled:opacity-50"
        >
          {working ? 'Threads에 예약 등록 중…' : '📅 (확장프로그램 방식) 이 시각에 예약하기'}
        </button>
        {!account && (
          <p className="mt-1 text-[11px] text-gold">설정에서 업로드할 스레드 아이디를 먼저 연결하세요.</p>
        )}
      </div>
    </div>,
    document.body
  )
}
