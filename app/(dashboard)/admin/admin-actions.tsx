'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import type { UserStatus } from '@/types'

export function AdminActions({ userId, currentStatus }: { userId: string; currentStatus: UserStatus }) {
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
      {/* 거절된 회원 → 승인 버튼만 */}
      {currentStatus === 'rejected' && (
        <Button
          size="sm"
          variant="primary"
          loading={loading === 'approve'}
          disabled={loading !== null}
          onClick={() => handleAction('approve')}
        >
          승인
        </Button>
      )}

      {/* 대기 회원 → 승인 + 거절 */}
      {currentStatus === 'pending' && (
        <>
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
        </>
      )}

      {/* 승인된 회원 → 거절 버튼만 */}
      {currentStatus === 'approved' && (
        <Button
          size="sm"
          variant="danger"
          loading={loading === 'reject'}
          disabled={loading !== null}
          onClick={() => handleAction('reject')}
        >
          거절
        </Button>
      )}
    </div>
  )
}
