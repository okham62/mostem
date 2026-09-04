'use client'

import { useMemo, useState } from 'react'
import { ACTION_LABELS, pageLabel } from '@/lib/activity-labels'

type LoginLog = {
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

type ActivityLog = {
  id: string
  action: string
  detail: Record<string, unknown> | null
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
  const days = range === '7d' ? 7 : 30
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
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

function deviceIcon(type: string | null) {
  if (type === '스마트폰') return '📱'
  if (type === '태블릿') return '📟'
  return '💻'
}

function detailText(action: string, detail: Record<string, unknown> | null) {
  if (!detail) return ''
  if (action === 'page_view') {
    const path = typeof detail.path === 'string' ? detail.path : ''
    const title = typeof detail.title === 'string' ? detail.title : pageLabel(path)
    return title + (path ? ` · ${path}` : '')
  }
  const parts: string[] = []
  if (typeof detail.title === 'string') parts.push(detail.title)
  if (typeof detail.channelName === 'string') parts.push(`채널 ${detail.channelName}`)
  if (typeof detail.count === 'number') parts.push(`${detail.count}건`)
  if (typeof detail.platform === 'string') parts.push(detail.platform)
  if (typeof detail.username === 'string') parts.push(`@${detail.username}`)
  return parts.join(' · ')
}

export function UserLogs({
  loginLogs,
  activityLogs,
}: {
  loginLogs: LoginLog[]
  activityLogs: ActivityLog[]
}) {
  const [range, setRange] = useState<RangeId>('7d')
  const since = startOfRange(range)

  const logins = useMemo(
    () => loginLogs.filter((log) => !since || new Date(log.created_at) >= since),
    [loginLogs, since],
  )
  const activities = useMemo(
    () => activityLogs.filter((log) => !since || new Date(log.created_at) >= since),
    [activityLogs, since],
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
    return [...groups.entries()]
  }, [logins])

  const deviceSummary = useMemo(() => {
    const counts = new Map<string, number>()
    for (const log of logins) {
      const key = [log.device_type, log.device_model].filter(Boolean).join(' · ') || '알 수 없음'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [logins])

  return (
    <div className="space-y-6">
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
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-center">
          <p className="text-xl font-bold text-brand">{logins.length}</p>
          <p className="text-xs text-[var(--muted)]">로그인</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-center">
          <p className="text-xl font-bold text-green-500">{activities.length}</p>
          <p className="text-xs text-[var(--muted)]">작업</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-center">
          <p className="truncate text-sm font-bold text-purple-400">
            {deviceSummary[0]?.[0] ?? '기록 없음'}
          </p>
          <p className="text-xs text-[var(--muted)]">주 사용 기기</p>
        </div>
      </div>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">시간대별 로그인</h2>
        <div className="flex h-24 items-end gap-1">
          {hourBuckets.map((count, hour) => (
            <div key={hour} className="flex flex-1 flex-col items-center justify-end gap-1">
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
        {deviceSummary.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {deviceSummary.map(([label, count]) => (
              <span key={label} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/60">
                {label} · {count}회
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">로그인 기록 ({logins.length})</h2>
        {logins.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted)]">해당 기간 로그인 기록이 없습니다.</p>
        ) : (
          <div className="space-y-5">
            {byDay.map(([day, items]) => (
              <div key={day}>
                <p className="mb-2 text-[11px] font-semibold text-white/40">{day} · {items.length}회</p>
                <div className="divide-y divide-[var(--card-border)]">
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
                          {[log.city, log.region, log.country].filter(Boolean).join(' ') || '위치 없음'}
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
      </section>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">작업 기록 ({activities.length})</h2>
        {activities.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted)]">해당 기간 작업 기록이 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--card-border)]">
            {activities.map((log) => {
              const info = ACTION_LABELS[log.action] ?? { label: log.action, icon: '•' }
              const extra = detailText(log.action, log.detail)
              const deviceType = typeof log.detail?.device_type === 'string' ? log.detail.device_type : ''
              const deviceModel = typeof log.detail?.device_model === 'string' ? log.detail.device_model : ''
              return (
                <div key={log.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">
                      {info.icon} {info.label}
                    </p>
                    {extra && <p className="text-xs text-white/45">{extra}</p>}
                    {(deviceType || deviceModel) && (
                      <p className="text-xs text-white/35">
                        {deviceIcon(deviceType)} {[deviceType, deviceModel].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-xs text-white/40">{formatDateTime(log.created_at)}</p>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
