'use client'

import { useMemo, useState } from 'react'

export type LoginLog = {
  id: string
  ip: string | null
  city: string | null
  region: string | null
  country: string | null
  device_type: string | null
  device_os: string | null
  device_browser: string | null
  device_model: string | null
  created_at: string
}

const RANGES = [
  { id: 'today', label: '오늘' },
  { id: '7d', label: '7일' },
  { id: '30d', label: '30일' },
  { id: 'all', label: '전체' },
] as const

type RangeId = (typeof RANGES)[number]['id']

function startOfRange(range: RangeId) {
  const now = new Date()
  if (range === 'all') return null
  if (range === 'today') {
    now.setHours(0, 0, 0, 0)
    return now
  }
  return new Date(Date.now() - (range === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000)
}

export function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
}

export function deviceIcon(type: string | null) {
  if (type === '스마트폰') return '📱'
  if (type === '태블릿') return '📟'
  return '💻'
}

export function LoginHistoryBody({ logs }: { logs: LoginLog[] }) {
  const [range, setRange] = useState<RangeId>('all')
  const since = startOfRange(range)

  const logins = useMemo(
    () => logs.filter((log) => !since || new Date(log.created_at) >= since),
    [logs, since]
  )

  const hourBuckets = useMemo(() => {
    const buckets = Array.from({ length: 24 }, () => 0)
    for (const log of logins) buckets[new Date(log.created_at).getHours()] += 1
    return buckets
  }, [logins])
  const maxHour = Math.max(1, ...hourBuckets)

  const byDay = useMemo(() => {
    const groups = new Map<string, LoginLog[]>()
    for (const log of logins) {
      const key = formatDay(log.created_at)
      const list = groups.get(key) ?? []
      list.push(log)
      groups.set(key, list)
    }
    return Array.from(groups.entries())
  }, [logins])

  const deviceSummary = useMemo(() => {
    const counts = new Map<string, number>()
    for (const log of logins) {
      const key = [log.device_type, log.device_model].filter(Boolean).join(' · ') || '알 수 없음'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [logins])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {RANGES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setRange(item.id)}
            className={
              range === item.id
                ? 'rounded-full bg-brand/20 px-3 py-1 text-xs font-semibold text-brand'
                : 'rounded-full bg-white/5 px-3 py-1 text-xs text-white/50 hover:bg-white/10 hover:text-white'
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <p className="text-lg font-bold text-brand">{logins.length}</p>
          <p className="text-[11px] text-white/40">로그인</p>
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <p className="truncate text-sm font-bold text-purple-300">{deviceSummary[0]?.[0] ?? '기록 없음'}</p>
          <p className="text-[11px] text-white/40">주 사용 기기</p>
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <p className="truncate text-sm font-bold text-gold">
            {logins[0] ? formatDateTime(logins[0].created_at) : '-'}
          </p>
          <p className="text-[11px] text-white/40">최근 접속</p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-white">시간대별 로그인</h3>
        <div className="flex h-20 items-end gap-1">
          {hourBuckets.map((count, hour) => (
            <div key={hour} className="flex flex-1 flex-col items-center justify-end">
              <div
                className="w-full rounded-sm bg-brand/70"
                style={{ height: `${Math.max(count ? 8 : 2, (count / maxHour) * 100)}%` }}
                title={`${hour}시 ${count}회`}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-white/30">
          <span>0시</span>
          <span>12시</span>
          <span>23시</span>
        </div>
      </div>

      {logins.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/40">해당 기간 로그인 기록이 없습니다.</p>
      ) : (
        <div className="space-y-5">
          {byDay.map(([day, items]) => (
            <div key={day}>
              <p className="mb-2 text-[11px] font-semibold text-white/40">
                {day} · {items.length}회
              </p>
              <div className="divide-y divide-white/10">
                {items.map((log) => (
                  <div key={log.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium text-white">
                        {deviceIcon(log.device_type)} {log.device_type || '기기 미상'}
                        {log.device_model ? ` · ${log.device_model}` : ''}
                      </p>
                      <p className="text-xs text-white/45">
                        {[log.device_os, log.device_browser].filter(Boolean).join(' · ') || 'OS/브라우저 정보 없음'}
                      </p>
                      <p className="text-xs text-white/40">
                        📍 {[log.city, log.region, log.country].filter(Boolean).join(' ') || '위치 없음'}
                        {log.ip ? ` · IP ${log.ip}` : ''}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-white/40">{formatDateTime(log.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
