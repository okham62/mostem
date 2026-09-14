'use client'

import { useEffect } from 'react'
import { isStaleChunkError, reloadOnceForStaleChunk } from '@/lib/chunk-error'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[mostem] root error', error?.message, error?.digest, error)
    // Soft-nav + extension DOM patches often leave React trees unrecoverable via reset().
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
      <p className="text-sm text-white/60">화면을 불러오지 못했습니다. 다시 열어 주세요.</p>
      {error?.message ? (
        <p className="max-w-md break-words text-[11px] text-white/35">{error.message}</p>
      ) : null}
      <button
        type="button"
        onClick={() => {
          try {
            window.location.assign('/threads?status=collected')
          } catch {
            try {
              window.location.reload()
            } catch {
              reset()
            }
          }
        }}
        className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
      >
        다시 시도
      </button>
    </div>
  )
}
