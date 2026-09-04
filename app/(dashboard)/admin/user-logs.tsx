'use client'

import { useMemo, useState } from 'react'
import { ACTION_LABELS, pageLabel } from '@/lib/activity-labels'
import { deviceIcon, formatDateTime } from './login-history'

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
  return new Date(Date.now() - (range === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000)
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

export function UserLogs({ activityLogs }: { activityLogs: ActivityLog[] }) {
  const [range, setRange] = useState<RangeId>('7d')
  const since = startOfRange(range)
  const activities = useMemo(
    () => activityLogs.filter((log) => !since || new Date(log.created_at) >= since),
    [activityLogs, since]
  )

  return (
    <div className="space-y-4">
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

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">활동 기록 ({activities.length})</h2>
        {activities.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted)]">해당 기간 활동 기록이 없습니다.</p>
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
                    {extra ? <p className="text-xs text-white/45">{extra}</p> : null}
                    {deviceType || deviceModel ? (
                      <p className="text-xs text-white/35">
                        {deviceIcon(deviceType)} {[deviceType, deviceModel].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
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
