import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ArrowLeft, Monitor, Activity } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { User } from '@/types'

const ACTION_LABELS: Record<string, { label: string; icon: string }> = {
  youtube_connect: { label: 'YouTube 채널 연결', icon: '📺' },
  youtube_upload:  { label: 'YouTube 업로드', icon: '⬆️' },
  youtube_disconnect: { label: 'YouTube 채널 해제', icon: '🔌' },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/dashboard')

  const { id } = await params
  const supabase = createAdminClient()

  const [userRes, loginLogsRes, activityLogsRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', id).single(),
    supabase.from('login_logs').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(30),
    supabase.from('activity_logs').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(50),
  ])

  const user = userRes.data as User | null
  if (!user) redirect('/admin')

  const loginLogs = loginLogsRes.data ?? []
  const activityLogs = activityLogsRes.data ?? []

  const statusMap = {
    pending:  { label: '대기', variant: 'warning' as const },
    approved: { label: '승인', variant: 'success' as const },
    rejected: { label: '거절', variant: 'danger' as const },
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-[var(--foreground)]">회원 상세</h1>
      </div>

      {/* 회원 기본 정보 */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-bold text-white">
            {user.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-lg font-bold text-[var(--foreground)]">{user.name}</p>
              <Badge variant={statusMap[user.status].variant}>{statusMap[user.status].label}</Badge>
              {user.role === 'admin' && <Badge variant="default">관리자</Badge>}
            </div>
            <p className="text-sm text-[var(--muted)]">아이디: {user.username ?? '-'}</p>
            <p className="text-xs text-[var(--muted)]">가입일: {formatDate(user.created_at)}</p>
          </div>
        </div>

        {/* 통계 */}
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--card-border)] pt-5">
          <div className="text-center">
            <p className="text-xl font-bold text-brand">{loginLogs.length}</p>
            <p className="text-xs text-[var(--muted)]">총 로그인</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-green-500">
              {activityLogs.filter(a => a.action === 'youtube_upload').length}
            </p>
            <p className="text-xs text-[var(--muted)]">업로드 횟수</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-purple-500">
              {activityLogs.filter(a => a.action === 'youtube_connect').length}
            </p>
            <p className="text-xs text-[var(--muted)]">채널 연결</p>
          </div>
        </div>
      </Card>

      {/* 로그인 기록 */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Monitor className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            로그인 기록 ({loginLogs.length})
          </h2>
        </div>
        {loginLogs.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted)]">로그인 기록이 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--card-border)]">
            {loginLogs.map((log: {
              id: string
              ip: string
              city: string
              region: string
              country: string
              created_at: string
            }) => (
              <div key={log.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    📍 {[log.city, log.region, log.country].filter(Boolean).join(' · ') || '알 수 없음'}
                  </p>
                  <p className="text-xs text-[var(--muted)]">IP: {log.ip}</p>
                </div>
                <p className="shrink-0 text-xs text-[var(--muted)]">{formatDate(log.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 활동 기록 */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            활동 기록 ({activityLogs.length})
          </h2>
        </div>
        {activityLogs.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted)]">활동 기록이 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--card-border)]">
            {activityLogs.map((log: {
              id: string
              action: string
              detail: Record<string, string>
              created_at: string
            }) => {
              const info = ACTION_LABELS[log.action] ?? { label: log.action, icon: '•' }
              return (
                <div key={log.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {info.icon} {info.label}
                    </p>
                    {log.detail?.title && (
                      <p className="text-xs text-[var(--muted)]">제목: {log.detail.title}</p>
                    )}
                    {log.detail?.channelName && (
                      <p className="text-xs text-[var(--muted)]">채널: {log.detail.channelName}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-xs text-[var(--muted)]">{formatDate(log.created_at)}</p>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
