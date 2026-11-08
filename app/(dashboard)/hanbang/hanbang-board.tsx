'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HANBANG_PLATFORMS, type HanbangPlatformId } from '@/lib/hanbang-platforms'

export type HanbangChannel = {
  id: string
  platform: string
  channel_id: string
  channel_name: string
}

const COLORS: Record<HanbangPlatformId, string> = {
  youtube: '#ff0033',
  tiktok: '#111111',
  instagram: '#d62976',
  threads: '#1c1c1e',
  facebook: '#1877f2',
  x: '#111111',
  pinterest: '#e60023',
}

export function HanbangBoard({
  channels,
  ready,
}: {
  channels: HanbangChannel[]
  ready: Record<HanbangPlatformId, boolean>
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const disconnect = async (id: string) => {
    setBusyId(id)
    setNotice(null)
    try {
      const res = await fetch('/api/oauth/youtube/disconnect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: id }),
      })
      if (!res.ok) {
        setNotice('연결 해제에 실패했습니다.')
        return
      }
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <p className="text-xs font-semibold tracking-wide text-brand">MULTI PUBLISHER</p>
        <h1 className="mt-1 text-2xl font-bold text-white">한방살포</h1>
        <p className="mt-1 text-sm text-white/50">
          플랫폼마다 따로 로그인합니다. 비밀번호는 저장하지 않고, 각 서비스가 발급한 권한만 서버에 둡니다.
        </p>
      </div>

      {notice && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {notice}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {HANBANG_PLATFORMS.map((platform) => {
          const linked = channels.filter((row) => row.platform === platform.id)
          const canConnect = ready[platform.id]
          return (
            <article
              key={platform.id}
              className="flex min-h-52 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ background: COLORS[platform.id] }}
                >
                  {platform.label.slice(0, 1)}
                </span>
                <div>
                  <h2 className="font-semibold text-white">{platform.label}</h2>
                  <p className="text-xs text-white/40">{linked.length}개 연결</p>
                </div>
              </div>

              <ul className="mt-4 flex-1 space-y-2">
                {linked.map((row) => (
                  <li key={row.id} className="rounded-xl border border-brand/40 bg-brand/10 px-3 py-2">
                    <p className="truncate text-sm font-medium text-white">{row.channel_name}</p>
                    <p className="text-[11px] text-brand">선택됨</p>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => disconnect(row.id)}
                      className="mt-1 text-xs text-white/50 underline-offset-2 hover:text-white hover:underline disabled:opacity-50"
                    >
                      연결 해제
                    </button>
                  </li>
                ))}
              </ul>

              {canConnect ? (
                <a
                  href={platform.authorize}
                  className="mt-4 block rounded-lg bg-sky-500 py-2 text-center text-sm font-semibold text-white hover:bg-sky-400"
                >
                  연결하기
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setNotice(
                      `${platform.label} 개발자 앱 키가 아직 없습니다. 키를 서버에 넣으면 이 버튼이 로그인 창으로 연결됩니다.`
                    )
                  }
                  className="mt-4 rounded-lg border border-white/15 py-2 text-sm text-white/70 hover:bg-white/5"
                >
                  연결하기
                </button>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
