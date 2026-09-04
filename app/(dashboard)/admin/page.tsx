import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Users } from 'lucide-react'
import type { User } from '@/types'
import { AdminUserRow, type MemberInternal } from './admin-user-row'

type LoginRow = {
  user_id: string
  created_at: string
  device_type: string | null
  device_model: string | null
  city: string | null
  region: string | null
}

function countByUser(rows: { user_id: string }[] | null) {
  const map = new Map<string, number>()
  for (const row of rows ?? []) {
    map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1)
  }
  return map
}

function emptyStats(): MemberInternal {
  return {
    loginCount: 0,
    collectCount: 0,
    uploadCount: 0,
    channelCount: 0,
    lastLoginAt: null,
    device: '',
    location: '',
  }
}

export default async function AdminPage() {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/dashboard')

  const supabase = createAdminClient()
  const [
    { data: users },
    { data: loginRows },
    { data: uploadRows },
    { data: collectRows },
    { data: channelRows },
    { data: threadRows },
  ] = await Promise.all([
    supabase.from('users').select('*').order('created_at', { ascending: false }),
    supabase
      .from('login_logs')
      .select('user_id, created_at, device_type, device_model, city, region')
      .order('created_at', { ascending: false })
      .limit(3000),
    supabase.from('uploads').select('user_id'),
    supabase.from('collected_posts').select('user_id'),
    supabase.from('platform_connections').select('user_id'),
    supabase.from('connected_accounts').select('user_id'),
  ])

  const loginCounts = countByUser(loginRows)
  const uploadCounts = countByUser(uploadRows)
  const collectCounts = countByUser(collectRows)
  const channelCounts = countByUser([...(channelRows ?? []), ...(threadRows ?? [])])
  const lastLoginByUser = new Map<string, LoginRow>()
  for (const row of loginRows ?? []) {
    if (!lastLoginByUser.has(row.user_id)) lastLoginByUser.set(row.user_id, row)
  }

  const statsByUser = new Map<string, MemberInternal>()
  for (const user of (users ?? []) as User[]) {
    const last = lastLoginByUser.get(user.id)
    statsByUser.set(user.id, {
      loginCount: loginCounts.get(user.id) ?? 0,
      collectCount: collectCounts.get(user.id) ?? 0,
      uploadCount: uploadCounts.get(user.id) ?? 0,
      channelCount: channelCounts.get(user.id) ?? 0,
      lastLoginAt: last?.created_at ?? null,
      device: [last?.device_type, last?.device_model].filter(Boolean).join(' · '),
      location: [last?.city, last?.region].filter(Boolean).join(' '),
    })
  }

  const all = (users ?? []) as User[]
  const pending = all.filter((u) => u.status === 'pending')
  const approved = all.filter((u) => u.status === 'approved')
  const rejected = all.filter((u) => u.status === 'rejected')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">회원 관리</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          가입 승인·삭제, 로그인·작업 기록, 수집·업로드·채널 상세는 관리자만 볼 수 있습니다.
        </p>
      </div>

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

      {pending.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-yellow-500" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">승인 대기 ({pending.length})</h2>
          </div>
          <div className="divide-y divide-[var(--card-border)]">
            {pending.map((user) => (
              <AdminUserRow
                key={user.id}
                user={user}
                stats={statsByUser.get(user.id) ?? emptyStats()}
                currentUserId={session.user.id}
              />
            ))}
          </div>
        </Card>
      )}

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
              <AdminUserRow
                key={user.id}
                user={user}
                stats={statsByUser.get(user.id) ?? emptyStats()}
                currentUserId={session.user.id}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
