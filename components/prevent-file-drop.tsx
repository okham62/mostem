'use client'

import { useEffect } from 'react'

/**
 * 파일을 브라우저에 드래그했을 때 새 탭으로 열리는 것을 전역 차단.
 * bubble phase, dropEffect 변경 없이 순수하게 preventDefault만.
 */
export function PreventFileDrop() {
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault()
    document.addEventListener('dragover', prevent)
    document.addEventListener('drop', prevent)
    return () => {
      document.removeEventListener('dragover', prevent)
      document.removeEventListener('drop', prevent)
    }
  }, [])

  return null
}
