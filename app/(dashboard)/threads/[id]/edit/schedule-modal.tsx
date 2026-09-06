'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ConnectedAccount } from '@/types'

const QUICK = [
  [10, '10분 뒤'],
  [30, '30분 뒤'],
  [60, '1시간 뒤'],
  [120, '2시간 뒤'],
  [180, '3시간 뒤'],
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
    <div className="flex min-w-[88px] flex-col items-center">
      <button
        type="button"
        onClick={() => onStep(1)}
        className="flex h-9 w-full items-center justify-center rounded-xl text-white/45 transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/8 hover:text-white active:scale-95"
        aria-label={`${label} 올리기`}
      >
        ▲
      </button>
      <p
        key={`${label}-${value}`}
        className="animate-schedule-tick py-0.5 text-[42px] font-bold leading-none tabular-nums tracking-tight text-white"
      >
        {pad(value)}
      </p>
      <button
        type="button"
        onClick={() => onStep(-1)}
        className="flex h-9 w-full items-center justify-center rounded-xl text-white/45 transition-all duration-150 hover:translate-y-0.5 hover:bg-white/8 hover:text-white active:scale-95"
        aria-label={`${label} 내리기`}
      >
        ▼
      </button>
      <p className="mt-1 text-[11px] text-white/35">{label}</p>
    </div>
  )
}

export function ScheduleModal({
  account,
  saving,
  initialAt,
  onClose,
  onConfirm,
}: {
  account?: ConnectedAccount
  saving: boolean
  initialAt: Date
  onClose: () => void
  onConfirm: (when: Date) => void | Promise<void>
}) {
  const [mounted, setMounted] = useState(false)
  const [when, setWhen] = useState(() => clampFuture(initialAt))
  const [quickMins, setQuickMins] = useState<number | null>(10)
  const days = useMemo(() => upcomingDays(7), [])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

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
    const dayCount = Math.floor(hours / 24)
    return `${dayCount}일 뒤`
  })()

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px] animate-schedule-backdrop-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-title"
        className="max-h-[min(92vh,820px)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#141418] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)] animate-schedule-card-in scrollbar-thin"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="schedule-title" className="text-lg font-bold text-white">
            예약 발행
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg px-1 text-white/40 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold">
            {(account?.username?.[0] ?? '나').toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">@{account?.username ?? '계정 미선택'}</p>
            <p className="text-xs text-white/45">이 계정에 예약돼요</p>
          </div>
        </div>

        <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.03] px-4 py-3.5 ring-1 ring-white/10">
          <p className="text-[11px] font-medium text-white/40">예약 시각</p>
          <p
            key={when.toISOString()}
            className="animate-schedule-tick mt-1 text-[22px] font-bold leading-snug tracking-tight text-white"
          >
            {when.toLocaleDateString('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}{' '}
            {meridiem} {when.getHours() % 12 || 12}:{pad(when.getMinutes())}
          </p>
          <p className="mt-1 text-xs text-gold">{relative}</p>
        </div>

        <p className="mb-2 text-[11px] font-medium text-white/40">빠르게</p>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {QUICK.map(([mins, label]) => (
            <button
              key={mins}
              type="button"
              onClick={() => pickQuick(mins)}
              className={`rounded-full px-3 py-1.5 text-xs transition-all duration-150 active:scale-95 ${
                quickMins === mins
                  ? 'bg-white text-black shadow-[0_4px_16px_rgba(255,255,255,0.18)]'
                  : 'bg-white/8 text-white/80 hover:bg-white/12'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="mb-2 text-[11px] font-medium text-white/40">날짜</p>
        <div className="mb-3 grid grid-cols-7 gap-1.5">
          {days.map((day, index) => {
            const selected = Boolean(selectedDay && sameDay(day, when))
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setCustom(withDate(when, day))}
                className={`flex flex-col items-center rounded-xl px-1 py-2 transition-all duration-200 active:scale-95 ${
                  selected
                    ? 'scale-[1.03] bg-white text-black shadow-[0_6px_18px_rgba(255,255,255,0.16)]'
                    : 'bg-white/6 text-white/75 hover:bg-white/10'
                }`}
              >
                <span className={`text-[10px] ${selected ? 'text-black/50' : 'text-white/40'}`}>
                  {dayChipLabel(day, index)}
                </span>
                <span className="mt-0.5 text-sm font-bold tabular-nums">{day.getDate()}</span>
              </button>
            )
          })}
        </div>
        <label
          className={`mb-4 flex items-center justify-between rounded-xl border px-3 py-2 text-xs transition-colors ${
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
            className="bg-transparent text-right text-xs text-white outline-none [color-scheme:dark]"
          />
        </label>

        <p className="mb-2 text-[11px] font-medium text-white/40">시간</p>
        <div className="mb-3 flex items-center justify-center gap-3 rounded-2xl bg-black/30 px-3 py-2">
          <p className="w-10 text-center text-sm font-semibold text-white/50">{meridiem}</p>
          <Stepper
            value={when.getHours()}
            label="시"
            onStep={(delta) => setCustom(withTime(when, (when.getHours() + delta + 24) % 24, when.getMinutes()))}
          />
          <span className="pb-5 text-3xl font-bold text-white/25">:</span>
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
        <div className="mb-4 flex flex-wrap gap-1.5">
          {HOUR_PRESETS.map(([hour, label]) => (
            <button
              key={hour}
              type="button"
              onClick={() => setCustom(withTime(when, hour, 0))}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-all duration-150 active:scale-95 ${
                when.getHours() === hour && when.getMinutes() === 0 && quickMins == null
                  ? 'bg-brand text-white'
                  : 'bg-white/8 text-white/70 hover:bg-white/12'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-3 rounded-xl border border-white/10 bg-black/30 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Threads 공식 API로 예약
          </p>
          <p className="mt-1 text-xs text-white/40">
            공식 API가 예약 시각에 발행해요. 브라우저나 노드를 켜둘 필요가 없어요.
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          확장이 응답하지 않으면 크롬 확장 관리에서 하미를 새로고침한 뒤 다시 시도해 주세요.
        </div>

        <button
          type="button"
          disabled={saving || !account}
          onClick={() => void onConfirm(clampFuture(when))}
          className="w-full rounded-xl bg-gold py-3 text-sm font-bold text-black transition-transform duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        >
          🗓️ (확장프로그램 방식) 이 시각에 예약하기
        </button>
        {!account && (
          <p className="mt-2 text-xs text-gold">설정에서 업로드할 스레드 아이디를 먼저 연결하세요.</p>
        )}
      </div>
    </div>,
    document.body
  )
}
