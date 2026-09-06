'use client'

import { useEffect } from 'react'
import { reloadOnceForStaleChunk } from '@/lib/chunk-error'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reloadOnceForStaleChunk(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-white/60">화면을 불러오지 못했습니다. 다시 열어 주세요.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
      >
        다시 시도
      </button>
    </div>
  )
}
