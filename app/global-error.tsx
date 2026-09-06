'use client'

import { useEffect } from 'react'
import { reloadOnceForStaleChunk } from '@/lib/chunk-error'

export default function GlobalError({
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
    <html lang="ko">
      <body style={{ margin: 0, background: '#0b0b0d', color: '#f4f4f5', fontFamily: 'sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
          <div>
            <p style={{ margin: '0 0 16px', fontSize: 14, opacity: 0.7 }}>
              화면을 불러오지 못했습니다. 다시 열어 주세요.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                border: 0,
                borderRadius: 12,
                background: '#6366f1',
                color: '#fff',
                padding: '10px 16px',
                fontWeight: 600,
              }}
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
