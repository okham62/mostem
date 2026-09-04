import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { User } from '@/types'
import { AdminCredentials } from '../../admin-credentials'
import { AdminActions } from '../../admin-actions'
import { UserLogs } from '../../user-logs'
import { MemberStats } from '../../member-stats'
import { LoginHistoryButton } from '../../login-history-modal'
import type { LoginLog } from '../../login-history'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/dashboard')

  const { id } = await params
  const supabase = createAdminClient()

  const [userRes, loginLogsRes, activityLogsRes, uploadsRes, channelsRes, threadsRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', id).single(),
    supabase.from('login_logs').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(500),
    supabase.from('activity_logs').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(200),
    supabase.from('uploads').select('id', { count: 'exact', head: true }).eq('user_id', id),
    supabase.from('platform_connections').select('id', { count: 'exact', head: true }).eq('user_id', id),
    supabase.from('connected_accounts').select('id', { count: 'exact', head: true }).eq('user_id', id),
  ])

  const user = userRes.data as User | null
  if (!user) redirect('/admin')

  const loginLogs = (loginLogsRes.data ?? []) as LoginLog[]
  const activityLogs = activityLogsRes.data ?? []
  const uploadCount = uploadsRes.count ?? 0
  const channelCount = (channelsRes.count ?? 0) + (threadsRes.count ?? 0)
  const isSelf = user.id === session.user.id
  const canDelete = !isSelf && user.role !== 'admin'
  const showActions = !isSelf && (user.role !== 'admin' || user.status !== 'approved')

  const statusMap = {
    pending: { label: '대기', variant: 'warning' as const },
    approved: { label: '승인', variant: 'success' as const },
    rejected: { label: '거절', variant: 'danger' as const },
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-[var(--foreground)]">회원 상세</h1>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-bold text-white">
            {user.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-bold text-[var(--foreground)]">{user.name}</p>
              <Badge variant={statusMap[user.status].variant}>{statusMap[user.status].label}</Badge>
              {user.role === 'admin' && <Badge variant="default">관리자</Badge>}
            </div>
            <p className="text-sm text-[var(--muted)]">아이디: {user.username ?? '-'}</p>
            <p className="text-xs text-[var(--muted)]">가입일: {formatDate(user.created_at)}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <LoginHistoryButton userId={user.id} userName={user.name || user.username || '회원'} logs={loginLogs} />
            <AdminCredentials userId={user.id} username={user.username ?? ''} />
            {showActions ? (
              <AdminActions
                userId={user.id}
                userName={user.name || user.username || '회원'}
                currentStatus={user.status}
                canDelete={canDelete}
              />
            ) : null}
          </div>
        </div>
        <MemberStats
          userId={user.id}
          userName={user.name || user.username || '회원'}
          loginCount={loginLogs.length}
          uploadCount={uploadCount}
          channelCount={channelCount}
          loginLogs={loginLogs}
        />
      </Card>

      <UserLogs activityLogs={activityLogs} />
    </div>
  )
}
