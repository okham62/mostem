'use client'

import { useEffect } from 'react'

/**
 * 브라우저가 드래그된 파일을 새 탭으로 여는 것을 전역 차단.
 * capture phase 사용 → 다른 모든 핸들러보다 먼저 실행.
 */
export function PreventFileDrop() {
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'none'
      }
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
    }

    // capture: true — 가장 먼저 실행, 어떤 요소보다 우선
    document.addEventListener('dragover', onDragOver, true)
    document.addEventListener('drop', onDrop, true)

    return () => {
      document.removeEventListener('dragover', onDragOver, true)
      document.removeEventListener('drop', onDrop, true)
    }
  }, [])

  return null
}
