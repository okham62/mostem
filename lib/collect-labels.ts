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

export const GRADE_PILL: Record<PerformanceGrade, string> = {
  explosion: 'bg-brand text-white',
  strong: 'bg-amber-500/25 text-amber-200',
  excellent: 'bg-violet-500/25 text-violet-200',
  normal: 'bg-white/10 text-white/70',
  weak: 'bg-white/5 text-white/45',
}

export function formatCount(value?: number | null) {
  if (value == null || value === 0) return '0'
  if (value >= 10000) return `${(value / 10000).toFixed(1)}만`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}천`
  return String(Math.round(value))
}

export function formatMultiplier(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '…'
  if (value >= 10000) return `${(value / 10000).toFixed(1)}만배`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}천배`
  const rounded = Math.round(value * 10) / 10
  if (Number.isInteger(rounded)) return `${rounded}배`
  return `${rounded.toFixed(1)}배`
}

function gradeFromMultiplier(multiplier: number): PerformanceGrade {
  if (multiplier >= 30) return 'explosion'
  if (multiplier >= 10) return 'strong'
  if (multiplier >= 3) return 'excellent'
  if (multiplier >= 1) return 'normal'
  return 'weak'
}

export function derivePostStats(post: {
  views?: number | null
  followers?: number | null
  likes?: number | null
  comments?: number | null
  shares?: number | null
  reposts?: number | null
  quotes?: number | null
  multiplier?: number | null
  grade?: PerformanceGrade | null
  engagement_rate?: number | null
  views_per_hour?: number | null
  spread?: number | null
  posted_at?: string | null
  collected_at?: string | null
}) {
  const views = post.views ?? 0
  const followers = post.followers ?? 0
  const likes = post.likes ?? 0
  const comments = post.comments ?? 0
  const shares = post.shares ?? 0
  const reposts = post.reposts ?? 0
  const quotes = post.quotes ?? 0
  const multiplier =
    post.multiplier ?? (views > 0 && followers > 0 ? views / followers : null)
  const grade = post.grade ?? (multiplier != null ? gradeFromMultiplier(multiplier) : null)
  const engagement =
    post.engagement_rate ??
    (views > 0 ? ((likes + comments + reposts + shares) / views) * 100 : null)
  const postedHours = post.posted_at
    ? Math.max((Date.now() - new Date(post.posted_at).getTime()) / 3_600_000, 0.25)
    : null
  const viewsPerHour =
    post.views_per_hour != null && post.views_per_hour > 0
      ? post.views_per_hour
      : views > 0 && postedHours
        ? views / postedHours
        : null
  const spread = post.spread ?? (views > 0 ? ((reposts + shares) / views) * 1000 : null)
  return { views, followers, likes, comments, shares, reposts, quotes, multiplier, grade, engagement, viewsPerHour, spread }
}

export function mediaSrc(url?: string | null) {
  if (!url) return null
  if (url.startsWith('/')) return url
  return `/api/media/proxy?url=${encodeURIComponent(url)}`
}
