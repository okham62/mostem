'use client'

import { useRouter } from 'next/navigation'
import { ExternalLink, RefreshCw, ChevronDown, ChevronUp, FileVideo, Images } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Upload, Platform } from '@/types'

const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
}

const PLATFORM_COLORS: Record<Platform, string> = {
  youtube: 'text-red-500',
  tiktok: 'text-[var(--foreground)]',
  instagram: 'text-pink-500',
}

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  completed: { label: '완료', variant: 'success' },
  uploading: { label: '업로드 중', variant: 'info' },
  pending:   { label: '대기', variant: 'warning' },
  failed:    { label: '실패', variant: 'danger' },
  scheduled: { label: '예약됨', variant: 'default' },
}

interface HistoryCardProps {
  upload: Upload
}

export function HistoryCard({ upload }: HistoryCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  const s = STATUS_MAP[upload.status] ?? { label: upload.status, variant: 'default' as const }
  const tags: string[] = upload.tags ?? []
  const typeLabel = upload.type === 'short' ? '📱 쇼폼' : '🎬 롱폼'

  // 다시 업로드: localStorage에 데이터 저장 후 /upload로 이동
  const handleReupload = () => {
    const reuseData = {
      title: upload.title,
      description: upload.description,
      tags: upload.tags,
      videoType: upload.type,
      platforms: upload.platforms,
    }
    localStorage.setItem('mostem_reuse', JSON.stringify(reuseData))
    router.push('/upload')
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] transition-shadow hover:shadow-md">
      {/* 상단 메인 영역 */}
      <div className="flex gap-4 p-4">
        {/* 썸네일 */}
        <div className="relative shrink-0">
          {upload.thumbnail_url ? (
            <img
              src={upload.thumbnail_url}
              alt={upload.title}
              className="h-20 w-32 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-20 w-32 flex-col items-center justify-center gap-1 rounded-xl bg-[var(--muted-bg)]">
              {upload.type === 'short'
                ? <Images className="h-6 w-6 text-[var(--muted)]" />
                : <FileVideo className="h-6 w-6 text-[var(--muted)]" />
              }
            </div>
          )}
          {/* 타입 뱃지 */}
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
            {typeLabel}
          </span>
        </div>

        {/* 내용 */}
        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-sm font-semibold text-[var(--foreground)] leading-snug">
                {upload.title}
              </p>
              <Badge variant={s.variant} className="shrink-0 text-[10px]">{s.label}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{formatDate(upload.created_at)}</p>
          </div>

          {/* 플랫폼 상태 */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {upload.platforms.map((platform: Platform) => {
              const pStatus = upload.platform_statuses?.[platform] ?? upload.status
              const ps = STATUS_MAP[pStatus] ?? { label: pStatus, variant: 'default' as const }
              const url = upload.platform_urls?.[platform]
              return (
                <div key={platform} className="flex items-center gap-1 rounded-full border border-[var(--card-border)] bg-[var(--muted-bg)] px-2.5 py-1 text-[11px]">
                  <span className={`font-semibold ${PLATFORM_COLORS[platform]}`}>
                    {PLATFORM_LABELS[platform]}
                  </span>
                  <Badge variant={ps.variant} className="text-[10px]">{ps.label}</Badge>
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="ml-0.5 text-brand hover:text-brand/80">
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 태그 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-[var(--card-border)] px-4 py-2.5">
          {tags.slice(0, 8).map(tag => (
            <span key={tag} className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
              #{tag}
            </span>
          ))}
          {tags.length > 8 && (
            <span className="rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
              +{tags.length - 8}
            </span>
          )}
        </div>
      )}

      {/* 설명 (접었다 펼치기) */}
      {upload.description && (
        <div className="border-t border-[var(--card-border)] px-4 py-2.5">
          <p className={`text-xs leading-relaxed text-[var(--muted)] ${!expanded ? 'line-clamp-2' : ''}`}>
            {upload.description}
          </p>
          {upload.description.length > 120 && (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="mt-1 flex items-center gap-0.5 text-[10px] font-medium text-brand hover:underline"
            >
              {expanded
                ? <><ChevronUp className="h-3 w-3" /> 접기</>
                : <><ChevronDown className="h-3 w-3" /> 더 보기</>
              }
            </button>
          )}
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex items-center justify-end gap-2 border-t border-[var(--card-border)] px-4 py-3">
        {/* 영상 보기 링크들 */}
        {upload.platforms.map((platform: Platform) => {
          const url = upload.platform_urls?.[platform]
          if (!url) return null
          return (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:border-brand hover:text-brand"
            >
              <ExternalLink className="h-3 w-3" />
              {PLATFORM_LABELS[platform]} 보기
            </a>
          )
        })}

        {/* 다시 업로드 */}
        <button
          type="button"
          onClick={handleReupload}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
        >
          <RefreshCw className="h-3 w-3" />
          다시 업로드
        </button>
      </div>
    </div>
  )
}
