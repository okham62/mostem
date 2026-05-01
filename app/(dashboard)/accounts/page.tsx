import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { ChannelCard } from './channel-card'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { PlatformConnection, Platform } from '@/types'

const PLATFORM_INFO: Record<Platform, {
  label: string
  description: string
  addPath: string | null
  comingSoon: boolean
  icon: React.ReactNode
  bg: string
}> = {
  youtube: {
    label: 'YouTube',
    description: '유튜브 채널에 롱폼/쇼폼 영상 업로드',
    addPath: '/accounts/add/youtube',
    comingSoon: false,
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#FF0000]">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    bg: 'bg-red-50 dark:bg-red-900/20',
  },
  tiktok: {
    label: 'TikTok',
    description: '틱톡 계정에 쇼폼 영상 업로드',
    addPath: null,
    comingSoon: true,
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-gray-900 dark:fill-white">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
    bg: 'bg-gray-50 dark:bg-gray-800/50',
  },
  instagram: {
    label: 'Instagram',
    description: '인스타그램 비즈니스 계정에 릴스 업로드',
    addPath: null,
    comingSoon: true,
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#E1306C]">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    bg: 'bg-pink-50 dark:bg-pink-900/20',
  },
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await auth()
  const supabase = createAdminClient()
  const { error } = await searchParams

  const { data } = await supabase
    .from('platform_connections')
    .select('*')
    .eq('user_id', session!.user.id)
    .order('created_at', { ascending: true })

  const connections = (data ?? []) as PlatformConnection[]

  // 플랫폼별로 그룹핑
  const grouped: Record<Platform, PlatformConnection[]> = {
    youtube: [],
    tiktok: [],
    instagram: [],
  }
  connections.forEach(c => {
    if (grouped[c.platform]) grouped[c.platform].push(c)
  })

  const errorMessages: Record<string, string> = {
    no_token: '로그아웃 후 다시 로그인해주세요.',
    no_channel: 'YouTube 채널을 찾을 수 없습니다.',
    api_403: 'YouTube Data API v3가 활성화되지 않았습니다.',
    api_401: '인증이 만료됐습니다. 로그아웃 후 다시 로그인해주세요.',
  }

  return (
    <div className="max-w-2xl space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">연결된 계정</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          채널을 여러 개 추가하면 업로드할 때 원하는 채널을 선택할 수 있습니다.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          ❌ {errorMessages[error] ?? `오류: ${error}`}
        </div>
      )}

      {(Object.entries(PLATFORM_INFO) as [Platform, typeof PLATFORM_INFO[Platform]][]).map(([platform, info]) => {
        const platformConnections = grouped[platform]
        return (
          <div key={platform} className="space-y-3">
            {/* 플랫폼 헤더 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${info.bg}`}>
                  {info.icon}
                </div>
                <span className="text-sm font-semibold text-[var(--foreground)]">{info.label}</span>
                <Badge variant={platformConnections.length > 0 ? 'success' : 'default'}>
                  {platformConnections.length > 0 ? `${platformConnections.length}개 연결됨` : '미연결'}
                </Badge>
              </div>
              {info.addPath && !info.comingSoon ? (
                <Link
                  href={info.addPath}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:border-brand hover:text-brand"
                >
                  <Plus className="h-3.5 w-3.5" />
                  채널 추가
                </Link>
              ) : info.comingSoon ? (
                <span className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs text-[var(--muted)] opacity-50">
                  준비 중
                </span>
              ) : null}
            </div>

            {/* 연결된 채널 목록 */}
            {platformConnections.length > 0 ? (
              <div className="space-y-2">
                {platformConnections.map(conn => (
                  <ChannelCard key={conn.id} conn={conn} icon={info.icon} bg={info.bg} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--card-border)] px-4 py-5 text-center text-sm text-[var(--muted)]">
                {info.comingSoon ? '도메인 연결 후 사용 가능합니다.' : '아직 연결된 채널이 없습니다.'}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
