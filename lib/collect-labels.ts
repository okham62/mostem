import type { CollectStatus, PerformanceGrade } from '@/types'

export const STATUS_LABEL: Record<CollectStatus, string> = {
  collected: '수집',
  analysis: '분석',
  editing: '편집',
  ready: '발행대기',
  failed: '발행실패',
  scheduled: '예약',
  uploaded: '업로드',
}

export const GRADE_LABEL: Record<PerformanceGrade, string> = {
  explosion: '폭발',
  strong: '강력',
  excellent: '우수',
  normal: '보통',
  weak: '약함',
}
