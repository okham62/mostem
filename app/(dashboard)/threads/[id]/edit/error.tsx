'use client'

import { useEffect } from 'react'
import { isStaleChunkError, reloadOnceForStaleChunk } from '@/lib/chunk-error'

export default function EditError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (reloadOnceForStaleChunk(error)) return
    if (isStaleChunkError(error)) {
      try {
        window.location.reload()
      } catch {
        /* ignore */
      }
    }
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-white/60">편집 화면을 불러오지 못했습니다. 다시 열어 주세요.</p>
      <button
        type="button"
        onClick={() => {
          try {
            window.location.assign(window.location.href)
          } catch {
            reset()
          }
        }}
        className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
      >
        다시 시도
      </button>
      <a href="/threads?status=collected" className="text-xs text-white/40 hover:text-white/70">
        스레드 목록으로
      </a>
    </div>
  )
}
