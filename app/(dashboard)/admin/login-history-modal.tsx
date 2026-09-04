'use client'

import { useEffect, useState } from 'react'
import { Monitor, X } from 'lucide-react'
import { LoginHistoryBody, type LoginLog } from './login-history'
import { cn } from '@/lib/utils'

export function LoginHistoryModal({
  open,
  onClose,
  userName,
  logs,
  userId,
}: {
  open: boolean
  onClose: () => void
  userName: string
  logs?: LoginLog[]
  userId?: string
}) {
  const [fetched, setFetched] = useState<LoginLog[] | null>(null)
  const [loading, setLoading] = useState(false)

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
    fetch(`/api/admin/users/${userId}/logins`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { logs?: LoginLog[] } | null) => {
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

  if (!open) return null
  const rows = logs ?? fetched ?? []

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
              <Monitor className="h-4 w-4 text-brand-300" />
              로그인 기록
            </p>
            <p className="mt-1 text-xs text-white/40">{userName} · 접속 기기와 위치를 확인합니다</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 scrollbar-thin">
          {loading && !rows.length ? (
            <p className="py-10 text-center text-sm text-white/40">로그인 기록을 불러오는 중</p>
          ) : (
            <LoginHistoryBody logs={rows} />
          )}
        </div>
      </div>
    </div>
  )
}

export function LoginHistoryButton({
  userId,
  userName,
  logs,
  className,
}: {
  userId?: string
  userName: string
  logs?: LoginLog[]
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
        <Monitor className="h-3.5 w-3.5" />
        로그인 기록
      </button>
      <LoginHistoryModal
        open={open}
        onClose={() => setOpen(false)}
        userName={userName}
        userId={userId}
        logs={logs}
      />
    </>
  )
}
