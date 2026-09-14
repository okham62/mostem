'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
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

const DOT: Record<CollectStatus, string> = {
  collected: 'bg-white/45',
  analysis: 'bg-sky-400',
  editing: 'bg-[#FBBF24]',
  ready: 'bg-violet-400',
  failed: 'bg-rose-400',
  scheduled: 'bg-amber-400',
  uploaded: 'bg-emerald-400',
}

export function StatusForceBadge({
  post,
  onUpdated,
  className = '',
}: {
  post: CollectedPost
  onUpdated?: (post: CollectedPost) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const scheduleIso = post.status === 'scheduled' ? resolveScheduledAt(post) : null
  const scheduleTime = scheduleIso ? formatScheduleBadgeTime(scheduleIso) : ''
  const current = FORCE_STATUSES.includes(post.status) ? post.status : 'collected'

  useLayoutEffect(() => {
    if (!open || !btnRef.current) {
      setMenuPos(null)
      return
    }
    const rect = btnRef.current.getBoundingClientRect()
    const width = Math.max(148, rect.width + 48)
    let left = rect.left
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8
    if (left < 8) left = 8
    setMenuPos({ top: rect.bottom + 6, left, width })
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onReposition() {
      if (!btnRef.current) return
      const rect = btnRef.current.getBoundingClientRect()
      const width = Math.max(148, rect.width + 48)
      let left = rect.left
      if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8
      if (left < 8) left = 8
      setMenuPos({ top: rect.bottom + 6, left, width })
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onReposition, true)
    window.addEventListener('resize', onReposition)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onReposition, true)
      window.removeEventListener('resize', onReposition)
    }
  }, [open])

  async function applyStatus(next: CollectStatus) {
    if (next === post.status || busy) {
      setOpen(false)
      return
    }
    setBusy(true)
    setOpen(false)

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
    } finally {
      setBusy(false)
    }
  }

  const menu =
    open && menuPos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            className="fixed z-[9999] overflow-hidden rounded-2xl border border-white/10 bg-[#16161c]/95 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width, animation: 'mostem-menu-in 160ms ease-out both' }}
          >
            {FORCE_STATUSES.map((status) => {
              const active = status === current
              return (
                <button
                  key={status}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={busy}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void applyStatus(status)
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12px] transition ${
                    active
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[status]}`} />
                  <span className="min-w-0 flex-1 font-medium tracking-tight">{STATUS_LABEL[status]}</span>
                  {active ? <Check className="h-3.5 w-3.5 shrink-0 text-[#FBBF24]" strokeWidth={2.5} /> : null}
                </button>
              )
            })}
          </div>,
          document.body,
        )
      : null

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <button
        ref={btnRef}
        type="button"
        disabled={busy}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="상태 변경"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={`group inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ring-white/0 transition hover:ring-white/20 disabled:cursor-wait disabled:opacity-60 ${STATUS_CLASS[current]}`}
      >
        {STATUS_LABEL[current]}
        {scheduleTime ? (
          <span className="text-[9px] font-medium opacity-80">{scheduleTime}</span>
        ) : null}
        <ChevronDown
          className={`h-3 w-3 opacity-70 transition duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  )
}
