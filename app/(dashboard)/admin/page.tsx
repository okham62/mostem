import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AdminActions } from './admin-actions'
import { formatDate } from '@/lib/utils'
import { Users } from 'lucide-react'
import type { User } from '@/types'

export default async function AdminPage() {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/dashboard')

  const supabase = createAdminClient()
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  const all = (users ?? []) as User[]
  const pending = all.filter(u => u.status === 'pending')
  const approved = all.filter(u => u.status === 'approved')
  const rejected = all.filter(u => u.status === 'rejected')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">회원 관리</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">가입 신청을 검토하고 승인하세요.</p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <p className="text-2xl font-bold text-yellow-500">{pending.length}</p>
          <p className="text-xs text-[var(--muted)]">승인 대기</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-green-500">{approved.length}</p>
          <p className="text-xs text-[var(--muted)]">승인됨</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-red-500">{rejected.length}</p>
          <p className="text-xs text-[var(--muted)]">거절됨</p>
        </Card>
      </div>

      {/* 승인 대기 */}
      {pending.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-yellow-500" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">승인 대기 ({pending.length})</h2>
          </div>
          <div className="divide-y divide-[var(--card-border)]">
            {pending.map((user) => (
              <UserRow key={user.id} user={user} showActions />
            ))}
          </div>
        </Card>
      )}

      {/* 전체 회원 */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-semibold text-[var(--foreground)]">전체 회원 ({all.length})</h2>
        </div>
        {all.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">가입 신청이 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--card-border)]">
            {all.map((user) => (
              <UserRow key={user.id} user={user} showActions={user.status === 'pending'} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function UserRow({ user, showActions }: { user: User; showActions: boolean }) {
  const statusMap = {
    pending: { label: '대기', variant: 'warning' as const },
    approved: { label: '승인', variant: 'success' as const },
    rejected: { label: '거절', variant: 'danger' as const },
  }
  const s = statusMap[user.status]

  return (
    <div className="flex items-center gap-4 py-3.5">
      {user.image ? (
        <img src={user.image} alt={user.name} className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-medium text-white">
          {user.name?.[0]?.toUpperCase() ?? 'U'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-[var(--foreground)]">{user.name}</p>
        <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden text-xs text-[var(--muted)] sm:block">{formatDate(user.created_at)}</span>
        <Badge variant={s.variant}>{s.label}</Badge>
        {showActions && <AdminActions userId={user.id} />}
      </div>
    </div>
  )
}
