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

export const STATUS_CLASS: Record<CollectStatus, string> = {
  collected: 'bg-white/10 text-white/70',
  analysis: 'bg-sky-500/20 text-sky-300',
  editing: 'bg-gold/20 text-gold',
  ready: 'bg-brand/20 text-brand',
  failed: 'bg-red-500/20 text-red-300',
  scheduled: 'bg-amber-500/20 text-amber-300',
  uploaded: 'bg-brand text-white',
}

export const GRADE_LABEL: Record<PerformanceGrade, string> = {
  explosion: '폭발',
  strong: '강력',
  excellent: '우수',
  normal: '보통',
  weak: '약함',
}

export function formatCount(value?: number | null) {
  if (value == null || value === 0) return '0'
  if (value >= 10000) return `${(value / 10000).toFixed(1)}만`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}천`
  return String(Math.round(value))
}

export function mediaSrc(url?: string | null) {
  if (!url) return null
  if (url.startsWith('/')) return url
  return `/api/media/proxy?url=${encodeURIComponent(url)}`
}
