'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import type { Platform } from '@/types'

interface ConnectButtonProps {
  platform: Platform
  isConnected: boolean
  connectionId?: string
}

export function ConnectButton({ platform, isConnected, connectionId }: ConnectButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleConnect = async () => {
    setLoading(true)
    // OAuth 플로우 시작 - 실제 구현 시 각 플랫폼 OAuth URL로 리다이렉트
    window.location.href = `/api/oauth/${platform}/connect`
  }

  const handleDisconnect = async () => {
    if (!connectionId) return
    setLoading(true)
    try {
      await fetch(`/api/oauth/${platform}/disconnect`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (isConnected) {
    return (
      <Button
        variant="outline"
        size="sm"
        loading={loading}
        onClick={handleDisconnect}
        className="shrink-0 text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
      >
        연결 해제
      </Button>
    )
  }

  return (
    <Button
      variant="primary"
      size="sm"
      loading={loading}
      onClick={handleConnect}
      className="shrink-0"
    >
      연결하기
    </Button>
  )
}
