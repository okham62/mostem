'use client'

import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, X } from 'lucide-react'
import { workBlocks, workSummary, type WorkLog } from '@/lib/work-log-display'
import { deviceIcon, formatDateTime } from './login-history'
import { cn } from '@/lib/utils'

const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'news', label: '뉴스' },
  { id: 'keyword', label: '키워드' },
  { id: 'ai', label: 'AI' },
  { id: 'other', label: '기타' },
] as const

function groupOf(action: string) {
  if (action.startsWith('news_') || action === 'page_view') {
    return action === 'page_view' ? 'other' : 'news'
  }
  if (action.startsWith('keyword_') || action === 'trend_open') return 'keyword'
  if (action.startsWith('ai_')) return 'ai'
  if (action === 'page_view') return 'other'
  return 'other'
}

function pageGroup(log: WorkLog) {
  if (log.action !== 'page_view') return groupOf(log.action)
  const path = typeof log.detail?.path === 'string' ? log.detail.path : ''
  if (path.startsWith('/news')) return 'news'
  if (path.startsWith('/keywords') || path.startsWith('/trends')) return 'keyword'
  if (path.startsWith('/ai')) return 'ai'
  return 'other'
}

export function WorkHistoryModal({
  open,
  onClose,
  userName,
  userId,
  logs,
}: {
  open: boolean
  onClose: () => void
  userName: string
  userId?: string
  logs?: WorkLog[]
}) {
  const [fetched, setFetched] = useState<WorkLog[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open || logs || !userId) return
    let alive = true
    setLoading(true)
    fetch(`/api/admin/users/${userId}/logs`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { logs?: WorkLog[] } | null) => {
        if (alive) setFetched(data?.logs ?? [])
      })
      .catch(() => {
        if (alive) setFetched([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [open, logs, userId])

  const rows = logs ?? fetched ?? []
  const filtered = useMemo(
    () => (filter === 'all' ? rows : rows.filter((log) => pageGroup(log) === filter)),
    [rows, filter]
  )

  if (!open) return null

  return (
    <div
      className="mostem-overlay fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mostem-sheet flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14141a] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/8 px-5 py-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-white">
              <ClipboardList className="h-4 w-4 text-brand-300" />
              작업 기록
            </p>
            <p className="mt-1 text-xs text-white/40">{userName} · 사이트에서 한 작업을 모두 확인합니다</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-1 border-b border-white/8 px-4 py-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold',
                filter === item.id ? 'bg-brand/20 text-white' : 'text-white/45 hover:bg-white/5 hover:text-white'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto px-5 py-4 scrollbar-thin">
          {loading && !rows.length ? (
            <p className="py-10 text-center text-sm text-white/40">작업 기록을 불러오는 중</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/40">해당 기록이 없습니다.</p>
          ) : (
            <div className="divide-y divide-white/8">
              {filtered.map((log) => {
                const info = workSummary(log)
                const blocks = workBlocks(log.detail)
                const deviceType = typeof log.detail?.device_type === 'string' ? log.detail.device_type : ''
                const deviceModel = typeof log.detail?.device_model === 'string' ? log.detail.device_model : ''
                return (
                  <div key={log.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">
                          {info.icon} {info.label}
                        </p>
                        {info.line ? <p className="mt-0.5 text-xs text-white/55">{info.line}</p> : null}
                      </div>
                      <p className="shrink-0 text-[11px] text-white/35">{formatDateTime(log.created_at)}</p>
                    </div>
                    {blocks.length > 0 ? (
                      <div className="mt-2 space-y-1.5 rounded-xl bg-white/5 p-3">
                        {blocks.map((block, index) => (
                          <div key={`${log.id}-${index}`}>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                              {block.label}
                            </p>
                            <p className="whitespace-pre-wrap break-words text-xs leading-5 text-white/75">
                              {block.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {deviceType || deviceModel ? (
                      <p className="mt-1 text-[11px] text-white/30">
                        {deviceIcon(deviceType)} {[deviceType, deviceModel].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function WorkHistoryButton({
  userId,
  userName,
  logs,
  className,
}: {
  userId?: string
  userName: string
  logs?: WorkLog[]
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/5 hover:text-white',
          className
        )}
      >
        <ClipboardList className="h-3.5 w-3.5" />
        작업 기록
      </button>
      <WorkHistoryModal
        open={open}
        onClose={() => setOpen(false)}
        userName={userName}
        userId={userId}
        logs={logs}
      />
    </>
  )
}
