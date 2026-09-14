'use client'

import { STATUS_CLASS, STATUS_LABEL } from '@/lib/collect-labels'
import { clearStoredSchedule, formatScheduleBadgeTime, resolveScheduledAt } from '@/lib/post-schedule'
import type { CollectedPost, CollectStatus } from '@/types'

const FORCE_STATUSES: CollectStatus[] = [
  'collected',
  'analysis',
  'editing',
  'ready',
  'failed',
  'scheduled',
  'uploaded',
]

export function StatusForceBadge({
  post,
  onUpdated,
  className = '',
}: {
  post: CollectedPost
  onUpdated?: (post: CollectedPost) => void
  className?: string
}) {
  const scheduleIso = post.status === 'scheduled' ? resolveScheduledAt(post) : null
  const scheduleTime = scheduleIso ? formatScheduleBadgeTime(scheduleIso) : ''
  const current = FORCE_STATUSES.includes(post.status) ? post.status : 'collected'

  async function applyStatus(next: CollectStatus) {
    if (next === post.status) return

    const leavingSchedule = post.status === 'scheduled' && next !== 'scheduled'
    const body: { status: CollectStatus; scheduled_at?: string | null } = { status: next }
    if (leavingSchedule) {
      body.scheduled_at = null
      clearStoredSchedule(post.id)
    }

    const optimistic: CollectedPost = {
      ...post,
      status: next,
      scheduled_at: leavingSchedule ? null : post.scheduled_at,
    }
    onUpdated?.(optimistic)

    try {
      const res = await fetch(`/api/threads/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        onUpdated?.(post)
        return
      }
      const data = await res.json().catch(() => ({}))
      if (data?.post) onUpdated?.(data.post as CollectedPost)
    } catch {
      onUpdated?.(post)
    }
  }

  return (
    <label
      className={`relative inline-flex shrink-0 cursor-pointer items-center ${className}`}
      title="상태 강제 변경"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span
        className={`pointer-events-none inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[current]}`}
      >
        {STATUS_LABEL[current]}
        {scheduleTime ? <span className="text-[9px] font-medium opacity-80">{scheduleTime}</span> : null}
        <span aria-hidden className="text-[9px] opacity-80">
          ▾
        </span>
      </span>
      <select
        aria-label="상태 강제 변경"
        value={current}
        onChange={(e) => {
          void applyStatus(e.target.value as CollectStatus)
        }}
        className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
      >
        {FORCE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABEL[status]}
          </option>
        ))}
      </select>
    </label>
  )
}
