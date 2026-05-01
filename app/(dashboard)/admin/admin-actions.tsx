'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function AdminActions({ userId }: { userId: string }) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const router = useRouter()

  const handleAction = async (action: 'approve' | 'reject') => {
    setLoading(action)
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="primary"
        loading={loading === 'approve'}
        disabled={loading !== null}
        onClick={() => handleAction('approve')}
      >
        승인
      </Button>
      <Button
        size="sm"
        variant="danger"
        loading={loading === 'reject'}
        disabled={loading !== null}
        onClick={() => handleAction('reject')}
      >
        거절
      </Button>
    </div>
  )
}
