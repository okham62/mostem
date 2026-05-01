import { auth } from '@/auth'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Upload, ExternalLink } from 'lucide-react'
import type { Upload as UploadType, Platform } from '@/types'

const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
}

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  completed: { label: '완료', variant: 'success' },
  uploading: { label: '업로드 중', variant: 'info' },
  pending: { label: '대기', variant: 'warning' },
  failed: { label: '실패', variant: 'danger' },
  scheduled: { label: '예약됨', variant: 'default' },
}

export default async function HistoryPage() {
  const session = await auth()
  const supabase = await createClient()

  const { data } = await supabase
    .from('uploads')
    .select('*')
    .eq('user_id', session!.user.id)
    .order('created_at', { ascending: false })

  const uploads = (data ?? []) as UploadType[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">업로드 기록</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          총 {uploads.length}개의 업로드 기록이 있습니다.
        </p>
      </div>

      {uploads.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Upload className="mb-3 h-12 w-12 text-[var(--muted)]" />
          <p className="font-medium text-[var(--foreground)]">업로드 기록이 없습니다</p>
          <p className="mt-1 text-sm text-[var(--muted)]">첫 영상을 업로드해 보세요.</p>
          <a
            href="/upload"
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            업로드하기
          </a>
        </Card>
      ) : (
        <div className="space-y-3">
          {uploads.map((upload) => {
            const s = STATUS_MAP[upload.status] ?? { label: upload.status, variant: 'default' as const }
            return (
              <Card key={upload.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  {upload.thumbnail_url ? (
                    <img
                      src={upload.thumbnail_url}
                      alt={upload.title}
                      className="h-16 w-28 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg bg-[var(--muted-bg)]">
                      <Upload className="h-6 w-6 text-[var(--muted)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-[var(--foreground)] line-clamp-2">{upload.title}</p>
                      <Badge variant={s.variant} className="shrink-0">{s.label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">{formatDate(upload.created_at)}</p>
                  </div>
                </div>

                {/* 플랫폼별 상태 */}
                <div className="flex flex-wrap gap-2 border-t border-[var(--card-border)] pt-3">
                  {upload.platforms.map((platform: Platform) => {
                    const pStatus = upload.platform_statuses?.[platform] ?? upload.status
                    const ps = STATUS_MAP[pStatus] ?? { label: pStatus, variant: 'default' as const }
                    const url = upload.platform_urls?.[platform]
                    return (
                      <div
                        key={platform}
                        className="flex items-center gap-1.5 rounded-lg bg-[var(--muted-bg)] px-2.5 py-1.5 text-xs"
                      >
                        <span className="font-medium text-[var(--foreground)]">
                          {PLATFORM_LABELS[platform]}
                        </span>
                        <Badge variant={ps.variant}>{ps.label}</Badge>
                        {url && (
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 text-brand" />
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
