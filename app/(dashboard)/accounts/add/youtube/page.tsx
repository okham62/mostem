'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, Check } from 'lucide-react'

interface Channel {
  id: string
  name: string
  thumbnail: string
  subscribers: string
  videoCount: string
}

export default function AddYouTubeChannelPage() {
  const router = useRouter()
  const [channels, setChannels] = useState<Channel[]>([])
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/oauth/youtube/channels').then(r => r.json()),
      fetch('/api/oauth/youtube/connected').then(r => r.json()),
    ])
      .then(([channelData, connectedData]) => {
        if (channelData.error) setError(channelData.error)
        else setChannels(channelData.channels ?? [])
        setConnectedIds(new Set(connectedData.channelIds ?? []))
      })
      .catch(() => setError('데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async (channel: Channel) => {
    setAdding(channel.id)
    try {
      const res = await fetch('/api/oauth/youtube/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: channel.id, channelName: channel.name }),
      })
      const data = await res.json()
      if (res.ok) {
        setJustAdded(prev => new Set(Array.from(prev).concat(channel.id)))
      } else {
        setError(data.error || '추가 실패')
      }
    } finally {
      setAdding(null)
    }
  }

  const formatCount = (count: string) => {
    const n = parseInt(count)
    if (n >= 10000) return `${(n / 10000).toFixed(1)}만`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}천`
    return count
  }

  const addedCount = justAdded.size

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/accounts')}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">YouTube 채널 추가</h1>
          <p className="text-sm text-[var(--muted)]">연결할 채널을 선택하세요 (여러 개 가능)</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20">
          ❌ {error}
          <button onClick={() => setError(null)} className="ml-2 underline">닫기</button>
        </div>
      )}

      {loading && (
        <div className="py-12 text-center text-sm text-[var(--muted)]">채널 목록 불러오는 중...</div>
      )}

      {!loading && channels.length === 0 && !error && (
        <div className="py-12 text-center text-sm text-[var(--muted)]">
          연결 가능한 YouTube 채널이 없습니다.
        </div>
      )}

      <div className="space-y-3">
        {channels.map(channel => {
          const alreadyConnected = connectedIds.has(channel.id)
          const isJustAdded = justAdded.has(channel.id)
          const isDone = alreadyConnected || isJustAdded
          const isAdding = adding === channel.id

          return (
            <Card key={channel.id} className="flex items-center gap-4">
              {channel.thumbnail ? (
                <img
                  src={channel.thumbnail}
                  alt={channel.name}
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-lg font-bold text-red-600">
                  {channel.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">{channel.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  구독자 {formatCount(channel.subscribers)} · 영상 {channel.videoCount}개
                </p>
              </div>
              <Button
                variant={isDone ? 'secondary' : 'primary'}
                size="sm"
                disabled={isDone || isAdding}
                loading={isAdding}
                onClick={() => handleAdd(channel)}
                className="shrink-0"
              >
                {isDone ? (
                  <><Check className="h-3.5 w-3.5" /> {alreadyConnected ? '연결됨' : '추가됨'}</>
                ) : (
                  <><Plus className="h-3.5 w-3.5" /> 추가</>
                )}
              </Button>
            </Card>
          )
        })}
      </div>

      {addedCount > 0 && (
        <Button variant="primary" size="lg" className="w-full" onClick={() => router.push('/accounts')}>
          완료 ({addedCount}개 채널 추가됨)
        </Button>
      )}
    </div>
  )
}
