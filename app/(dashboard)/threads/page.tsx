import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { ThreadCard } from './thread-card'
import { STATUS_LABEL } from '@/lib/collect-labels'
import type { CollectedPost, CollectStatus, ConnectedAccount } from '@/types'

const STATUS_ORDER: CollectStatus[] = [
  'collected',
  'analysis',
  'editing',
  'ready',
  'failed',
  'scheduled',
  'uploaded',
]

export default async function ThreadsPage() {
  const session = await auth()
  const supabase = createAdminClient()

  const [postsRes, accountsRes] = await Promise.all([
    supabase
      .from('collected_posts')
      .select('*')
      .eq('user_id', session!.user.id)
      .eq('platform', 'threads')
      .order('collected_at', { ascending: false }),
    supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', session!.user.id)
      .eq('platform', 'threads')
      .order('created_at', { ascending: true }),
  ])

  const posts = (postsRes.data ?? []) as CollectedPost[]
  const accounts = (accountsRes.data ?? []) as ConnectedAccount[]
  const counts = Object.fromEntries(
    STATUS_ORDER.map((status) => [status, posts.filter((p) => p.status === status).length])
  ) as Record<CollectStatus, number>

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">수집된 스레드</h1>
          <p className="mt-1 text-sm text-white/45">
            하미에서 수집한 스레드가 여기에 쌓입니다. mostem.kr에 로그인한 상태로 수집하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/compose"
            className="rounded-xl bg-white/8 px-3 py-2 text-xs font-semibold text-white hover:bg-white/12"
          >
            새 글
          </Link>
          <a
            href="https://www.threads.net/"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white"
          >
            수집하러 가기
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {accounts.length > 0 ? (
          accounts.map((account) => (
            <span
              key={account.id}
              className="rounded-full bg-white/8 px-2.5 py-1 text-white/70"
            >
              @{account.username}
            </span>
          ))
        ) : (
          <Link href="/settings" className="rounded-full bg-gold/15 px-2.5 py-1 text-gold">
            설정에서 스레드 아이디 연결하기
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg bg-white/8 px-2.5 py-1 text-white/70">전체 {posts.length}</span>
        {STATUS_ORDER.map((status) => (
          <span key={status} className="rounded-lg bg-white/5 px-2.5 py-1 text-white/45">
            {STATUS_LABEL[status]} {counts[status]}
          </span>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <p className="text-sm text-white/50">아직 수집된 스레드가 없습니다.</p>
          <p className="mt-2 text-xs text-white/30">
            1) 설정에서 스레드 아이디 연결 → 2) mostem.kr 로그인 유지 → 3) 스레드에서 하미 수집
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <ThreadCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
