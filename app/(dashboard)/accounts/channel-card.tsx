'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import type { PlatformConnection } from '@/types'

interface ChannelCardProps {
  conn: PlatformConnection
  icon: React.ReactNode
  bg: string
}

export function ChannelCard({ conn, icon, bg }: ChannelCardProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(conn.channel_name)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const handleRename = async () => {
    if (!name.trim() || name.trim() === conn.channel_name) {
      setIsEditing(false)
      setName(conn.channel_name)
      return
    }
    setSaving(true)
    try {
      await fetch('/api/oauth/rename', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: conn.id, name: name.trim() }),
      })
      setIsEditing(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`"${name}" 채널 연결을 해제하시겠습니까?`)) return
    setDeleting(true)
    try {
      await fetch('/api/oauth/youtube/disconnect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: conn.id }),
      })
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="flex items-center gap-3 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') { setIsEditing(false); setName(conn.channel_name) }
              }}
              className="flex-1 rounded-md border border-brand bg-[var(--card-bg)] px-2 py-0.5 text-sm text-[var(--foreground)] outline-none focus:ring-1 focus:ring-brand"
            />
            <button onClick={handleRename} disabled={saving} className="text-green-500 hover:text-green-600">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => { setIsEditing(false); setName(conn.channel_name) }} className="text-[var(--muted)] hover:text-[var(--foreground)]">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{name}</p>
            <button
              onClick={() => setIsEditing(true)}
              className="shrink-0 text-[var(--muted)] opacity-0 transition-opacity hover:text-brand group-hover:opacity-100"
              title="이름 수정"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <p className="text-xs text-[var(--muted)]">연결일: {formatDate(conn.created_at)}</p>
      </div>

      {!isEditing && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--muted-bg)] hover:text-brand"
            title="이름 수정"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-900/20"
            title="연결 해제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </Card>
  )
}
