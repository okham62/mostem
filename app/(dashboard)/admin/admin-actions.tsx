'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import type { UserStatus } from '@/types'

export function AdminActions({
  userId,
  userName,
  currentStatus,
  canDelete = false,
}: {
  userId: string
  userName: string
  currentStatus: UserStatus
  canDelete?: boolean
}) {
  const [loading, setLoading] = useState<'approve' | 'reject' | 'delete' | null>(null)
  const router = useRouter()

  const handleAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (action === 'delete') {
      const ok = window.confirm(
        `${userName} 회원을 삭제할까요?\n계정과 기록이 모두 지워지며, 같은 아이디로 다시 가입할 수 있습니다.`
      )
      if (!ok) return
    }

    setLoading(action)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        window.alert(data.error || '처리에 실패했습니다.')
        return
      }
      if (action === 'delete') {
        router.push('/admin')
      }
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
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

      {canDelete ? (
        <Button
          size="sm"
          variant="outline"
          loading={loading === 'delete'}
          disabled={loading !== null}
          className="border-red-500/40 text-red-400 hover:bg-red-500/10"
          onClick={() => handleAction('delete')}
        >
          삭제
        </Button>
      ) : null}
    </div>
  )
}
