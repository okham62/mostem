import { auth } from '@/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { Upload as UploadType, PlatformConnection } from '@/types'

export default async function DashboardPage() {
  const session = await auth()
  const supabase = await createClient()

  const [uploadsRes, connectionsRes] = await Promise.all([
    supabase
      .from('uploads')
      .select('*')
      .eq('user_id', session!.user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', session!.user.id),
  ])

  const uploads: UploadType[] = uploadsRes.data ?? []
  const connections: PlatformConnection[] = connectionsRes.data ?? []

  const stats = {
    total: uploads.length,
    completed: uploads.filter(u => u.status === 'completed').length,
    pending: uploads.filter(u => u.status === 'pending' || u.status === 'uploading').length,
    failed: uploads.filter(u => u.status === 'failed').length,
  }

  const platformLabels = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram' }
  const connectedPlatforms = connections.map(c => c.platform)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          안녕하세요, {session?.user?.name?.split(' ')[0]}님 👋
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">오늘도 좋은 콘텐츠를 업로드해 보세요.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<Upload className="h-5 w-5 text-brand" />}
          label="전체 업로드"
          value={stats.total}
          bgColor="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
          label="완료"
          value={stats.completed}
          bgColor="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-yellow-500" />}
          label="진행 중"
          value={stats.pending}
          bgColor="bg-yellow-50 dark:bg-yellow-900/20"
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5 text-red-500" />}
          label="실패"
          value={stats.failed}
          bgColor="bg-red-50 dark:bg-red-900/20"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 최근 업로드 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>최근 업로드</CardTitle>
                <Link href="/history" className="text-xs font-medium text-brand hover:underline">
                  전체 보기
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {uploads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Upload className="mb-3 h-10 w-10 text-[var(--muted)]" />
                  <p className="text-sm text-[var(--muted)]">아직 업로드한 영상이 없습니다.</p>
                  <Link
                    href="/upload"
                    className="mt-3 text-sm font-medium text-brand hover:underline"
                  >
                    첫 영상 업로드하기
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--card-border)]">
                  {uploads.map((upload) => (
                    <li key={upload.id} className="flex items-center gap-3 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">
                          {upload.title}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {formatDate(upload.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="flex gap-1">
                          {upload.platforms.map(p => (
                            <span
                              key={p}
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: p === 'youtube' ? '#FEE2E2' : p === 'tiktok' ? '#F1F5F9' : '#FCE7F3',
                                color: p === 'youtube' ? '#EF4444' : p === 'tiktok' ? '#475569' : '#EC4899',
                              }}
                            >
                              {platformLabels[p]}
                            </span>
                          ))}
                        </div>
                        <StatusBadge status={upload.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 연결된 계정 */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>연결된 계정</CardTitle>
                <Link href="/accounts" className="text-xs font-medium text-brand hover:underline">
                  관리
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {(['youtube', 'tiktok', 'instagram'] as const).map((platform) => {
                  const connected = connectedPlatforms.includes(platform)
                  const conn = connections.find(c => c.platform === platform)
                  return (
                    <li key={platform} className="flex items-center gap-3">
                      <PlatformIcon platform={platform} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {platformLabels[platform]}
                        </p>
                        {connected && conn && (
                          <p className="truncate text-xs text-[var(--muted)]">{conn.channel_name}</p>
                        )}
                      </div>
                      {connected ? (
                        <Badge variant="success">연결됨</Badge>
                      ) : (
                        <Link href="/accounts">
                          <Badge variant="default">연결</Badge>
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>

          {/* 빠른 업로드 */}
          <div className="mt-4">
            <Link
              href="/upload"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              <Upload className="h-4 w-4" />
              새 영상 업로드
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  bgColor,
}: {
  icon: React.ReactNode
  label: string
  value: number
  bgColor: string
}) {
  return (
    <Card className="flex items-center gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bgColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
        <p className="text-xs text-[var(--muted)]">{label}</p>
      </div>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' | 'info' }> = {
    completed: { label: '완료', variant: 'success' },
    uploading: { label: '업로드 중', variant: 'info' },
    pending: { label: '대기', variant: 'warning' },
    failed: { label: '실패', variant: 'danger' },
    scheduled: { label: '예약', variant: 'default' },
  }
  const item = map[status] ?? { label: status, variant: 'default' }
  return <Badge variant={item.variant}>{item.label}</Badge>
}

function PlatformIcon({ platform }: { platform: 'youtube' | 'tiktok' | 'instagram' }) {
  const icons = {
    youtube: (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-red-600">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      </div>
    ),
    tiktok: (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-gray-900 dark:fill-white">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      </div>
    ),
    instagram: (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-900/30">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-pink-600">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </div>
    ),
  }
  return icons[platform]
}
