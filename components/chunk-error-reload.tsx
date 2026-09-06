'use client'

import { useEffect } from 'react'
import { isStaleChunkError, reloadOnceForStaleChunk } from '@/lib/chunk-error'

export function ChunkErrorReload() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isStaleChunkError(event.error) || isStaleChunkError(event.message)) {
        reloadOnceForStaleChunk(event.error ?? event.message)
      }
    }
    const onReject = (event: PromiseRejectionEvent) => {
      if (!isStaleChunkError(event.reason)) return
      event.preventDefault()
      reloadOnceForStaleChunk(event.reason)
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onReject)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onReject)
    }
  }, [])

  return null
}
