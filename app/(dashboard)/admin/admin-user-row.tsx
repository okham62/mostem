'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { AdminActions } from './admin-actions'
import { AdminCredentials } from './admin-credentials'
import { LoginHistoryButton } from './login-history-modal'
import { MemberActivityButton } from './member-activity-modal'
import { formatDate } from '@/lib/utils'
import type { User } from '@/types'

export type MemberInternal = {
  loginCount: number
  collectCount: number
  uploadCount: number
  channelCount: number
  lastLoginAt: string | null
  device: string
  location: string
}

export function AdminUserRow({
  user,
  stats,
  currentUserId,
}: {
  user: User
  stats: MemberInternal
  currentUserId: string
}) {
  const statusMap = {
    pending: { label: '대기', variant: 'warning' as const },
    approved: { label: '승인', variant: 'success' as const },
    rejected: { label: '거절', variant: 'danger' as const },
  }
  const s = statusMap[user.status]
  const userName = user.name || user.username || '회원'
  const canDelete = user.id !== currentUserId && user.role !== 'admin'
  const showActions = user.status !== 'approved' || user.role !== 'admin' || canDelete

  return (
    <div className="flex items-center gap-4 py-3.5">
      {user.image ? (
        <img src={user.image} alt={user.name} className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-medium text-white">
          {user.name?.[0]?.toUpperCase() ?? 'U'}
        </div>
      )}
      <div className="min-w-[140px] max-w-[180px] shrink-0">
        <Link href={`/admin/users/${user.id}`} className="hover:underline">
          <p className="truncate text-sm font-medium text-[var(--foreground)]">{user.name}</p>
        </Link>
        <p className="truncate text-xs text-[var(--muted)]">@{user.username ?? user.email}</p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-semibold text-brand-300 ring-1 ring-brand/20">
            로그인 {stats.loginCount}
          </span>
          <MemberActivityButton
            userId={user.id}
            userName={userName}
            tab="collect"
            count={stats.collectCount}
            label="수집"
          />
          <MemberActivityButton
            userId={user.id}
            userName={userName}
            tab="upload"
            count={stats.uploadCount}
            label="업로드"
          />
          <MemberActivityButton
            userId={user.id}
            userName={userName}
            tab="channels"
            count={stats.channelCount}
            label="채널"
          />
        </div>
        <p className="mt-1.5 max-w-full truncate text-[11px] text-white/40">
          {stats.lastLoginAt
            ? `최근 로그인 ${formatDate(stats.lastLoginAt)}${stats.device ? ` · ${stats.device}` : ''}${stats.location ? ` · ${stats.location}` : ''}`
            : '로그인 기록 없음'}
        </p>
      </div>

      <div className="relative flex shrink-0 items-center gap-2">
        <span className="hidden text-xs text-[var(--muted)] sm:block">{formatDate(user.created_at)}</span>
        <Badge variant={s.variant}>{s.label}</Badge>
        <LoginHistoryButton userId={user.id} userName={userName} />
        <AdminCredentials userId={user.id} username={user.username ?? ''} />
        {showActions ? (
          <AdminActions
            userId={user.id}
            userName={userName}
            currentStatus={user.status}
            canDelete={canDelete}
          />
        ) : null}
      </div>
    </div>
  )
}
