import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { User } from '@/types'
import { AdminCredentials } from '../../admin-credentials'
import { UserLogs } from '../../user-logs'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
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

  const [userRes, loginLogsRes, activityLogsRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', id).single(),
    supabase.from('login_logs').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(200),
    supabase.from('activity_logs').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(200),
  ])

  const user = userRes.data as User | null
  if (!user) redirect('/admin')

  const loginLogs = loginLogsRes.data ?? []
  const activityLogs = activityLogsRes.data ?? []
  const lastLogin = loginLogs[0]

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
            {lastLogin && (
              <p className="mt-1 text-xs text-white/50">
                최근 로그인 {formatDate(lastLogin.created_at)}
                {lastLogin.device_type ? ` · ${lastLogin.device_type}` : ''}
                {lastLogin.device_model ? ` · ${lastLogin.device_model}` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 border-t border-[var(--card-border)] pt-5">
          <AdminCredentials userId={user.id} username={user.username ?? ''} variant="panel" />
        </div>
      </Card>

      <UserLogs loginLogs={loginLogs} activityLogs={activityLogs} />
    </div>
  )
}
