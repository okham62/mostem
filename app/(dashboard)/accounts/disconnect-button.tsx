'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function DisconnectButton({ connectionId }: { connectionId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDisconnect = async () => {
    if (!confirm('이 채널 연결을 해제하시겠습니까?')) return
    setLoading(true)
    try {
      await fetch('/api/oauth/youtube/disconnect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDisconnect}
      disabled={loading}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-900/20"
      title="연결 해제"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
