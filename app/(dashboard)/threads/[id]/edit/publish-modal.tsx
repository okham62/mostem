'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { isHamiOnline } from '@/lib/threads-publish'
import type { ConnectedAccount } from '@/types'

export function PublishModal({
  account,
  saving,
  message,
  onClose,
  onExtensionUpload,
  onDownload,
}: {
  account?: ConnectedAccount
  saving: boolean
  message?: string
  onClose: () => void
  onExtensionUpload: () => void
  onDownload: () => void
}) {
  const [hamiOn, setHamiOn] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const tick = () => setHamiOn(isHamiOnline())
    tick()
    const id = window.setInterval(tick, 400)
    return () => window.clearInterval(id)
  }, [])

  const handle = account ? `@${account.username}` : '@계정 미선택'

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#121214] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">발행하기</h2>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
            {(account?.username?.[0] ?? '?').toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{handle}</p>
            <p className="text-xs text-white/45">이 계정에 올라가요</p>
          </div>
        </div>

        {!hamiOn && (
          <p className="mb-3 text-xs font-medium text-amber-300">
            발행하려면 확장프로그램이 필요해요 — 설치한 뒤 다시 열어 주세요.
          </p>
        )}

        <div className="space-y-2">
          <button
            type="button"
            disabled={saving}
            onClick={onExtensionUpload}
            className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-[#1a1a1e] px-4 py-3 text-left hover:bg-white/5 disabled:opacity-50"
          >
            <span className="mt-0.5 text-lg text-amber-300">◆</span>
            <span>
              <span className="block text-sm font-semibold text-white">
                {saving ? '업로드 중...' : '확장프로그램으로 업로드'}
              </span>
              <span className="mt-1 block text-xs text-white/40">
                {hamiOn
                  ? '하미가 스레드 작성창을 열고 자동으로 올립니다.'
                  : '확장프로그램을 켜면 자동으로 올라가요 → chrome://extensions 에서 하미 켜기'}
              </span>
            </span>
          </button>

          <div className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-[#1a1a1e] px-4 py-3 opacity-55">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">Threads 공식 발행</p>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">준비 중</span>
              </div>
              <p className="mt-1 text-xs text-white/40">
                메타 공식 API로 서버가 바로 올려요. 브라우저도 폰도 안 켜도 돼요.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDownload}
            className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-[#1a1a1e] px-4 py-3 text-left hover:bg-white/5"
          >
            <span className="mt-0.5 text-lg text-violet-400">⬇</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">그냥 압축파일로 다운로드</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  지금 바로 가능
                </span>
              </span>
              <span className="mt-1 block text-xs text-white/40">
                영상·사진·글을 저장한 뒤 내가 게시
              </span>
            </span>
          </button>
        </div>

        {message ? <p className="mt-3 text-xs text-gold">{message}</p> : null}
      </div>
    </div>,
    document.body
  )
}
