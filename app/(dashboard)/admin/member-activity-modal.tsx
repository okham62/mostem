'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, X } from 'lucide-react'
import { STATUS_LABEL } from '@/lib/collect-labels'
import { cn, formatDate } from '@/lib/utils'

export type ActivityTab = 'collect' | 'upload' | 'channels'

type CollectRow = {
  id: string
  platform: string
  author: string | null
  caption: string | null
  url: string | null
  status: string
  collected_at: string
  thumbnail_url: string | null
  views: number | null
  likes: number | null
}

type UploadRow = {
  id: string
  title: string
  status: string
  type: string
  platforms: string[] | null
  platform_urls: Record<string, string> | null
  thumbnail_url: string | null
  created_at: string
}

type ChannelRow = {
  id: string
  platform: string
  handle: string
  accountId: string
  created_at: string
}

const PLATFORM_LABEL: Record<string, string> = {
  youtube: '유튜브',
  threads: '스레드',
  instagram: '인스타그램',
  tiktok: '틱톡',
  douyin: '도우인',
  xiaohongshu: '샤오홍슈',
  naver: '네이버 블로그',
  blog: '네이버 블로그',
}

const UPLOAD_STATUS: Record<string, string> = {
  pending: '대기',
  uploading: '업로드 중',
  completed: '완료',
  failed: '실패',
  scheduled: '예약',
}

function platformLabel(value: string) {
  return PLATFORM_LABEL[value] || value
}

function handleText(row: ChannelRow) {
  const handle = row.handle.replace(/^@/, '')
  if (!handle) return row.accountId || '-'
  if (row.platform === 'youtube' || row.platform === 'tiktok') return handle
  return `@${handle}`
}

export function MemberActivityModal({
  open,
  tab,
  userId,
  userName,
  onClose,
}: {
  open: boolean
  tab: ActivityTab
  userId: string
  userName: string
  onClose: () => void
}) {
  const [active, setActive] = useState<ActivityTab>(tab)
  const [loading, setLoading] = useState(false)
  const [posts, setPosts] = useState<CollectRow[]>([])
  const [uploads, setUploads] = useState<UploadRow[]>([])
  const [channels, setChannels] = useState<ChannelRow[]>([])

  useEffect(() => {
    if (open) setActive(tab)
  }, [open, tab])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    fetch(`/api/admin/users/${userId}/activity`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive || !data) return
        setPosts(data.posts ?? [])
        setUploads(data.uploads ?? [])
        setChannels(data.channels ?? [])
      })
      .catch(() => {
        if (!alive) return
        setPosts([])
        setUploads([])
        setChannels([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [open, userId])

  const groupedChannels = useMemo(() => {
    const map = new Map<string, ChannelRow[]>()
    for (const row of channels) {
      const key = row.platform || 'other'
      const list = map.get(key) ?? []
      list.push(row)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [channels])

  if (!open) return null

  const titles = {
    collect: '수집된 내용',
    upload: '업로드된 내용',
    channels: '채널 상세정보',
  }

  return (
    <div
      className="mostem-overlay fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mostem-sheet flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14141a] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-white">{titles[active]}</p>
            <p className="mt-1 text-xs text-white/40">{userName} · 관리자만 확인할 수 있습니다</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-1 border-b border-white/8 px-4 py-2">
          {(
            [
              ['collect', '수집', posts.length],
              ['upload', '업로드', uploads.length],
              ['channels', '채널', channels.length],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold',
                active === id ? 'bg-brand/20 text-white' : 'text-white/45 hover:bg-white/5 hover:text-white'
              )}
            >
              {label} {count}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto px-5 py-4 scrollbar-thin">
          {loading ? (
            <p className="py-10 text-center text-sm text-white/40">불러오는 중</p>
          ) : active === 'collect' ? (
            posts.length === 0 ? (
              <p className="py-10 text-center text-sm text-white/40">수집된 내용이 없습니다.</p>
            ) : (
              <div className="divide-y divide-white/8">
                {posts.map((post) => (
                  <div key={post.id} className="flex gap-3 py-3">
                    {post.thumbnail_url ? (
                      <img src={post.thumbnail_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-lg bg-white/5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm text-white">{post.caption || '본문 없음'}</p>
                      <p className="mt-1 text-[11px] text-white/40">
                        {platformLabel(post.platform)} · @{post.author || 'unknown'} ·{' '}
                        {STATUS_LABEL[post.status as keyof typeof STATUS_LABEL] || post.status}
                        {post.collected_at ? ` · ${formatDate(post.collected_at)}` : ''}
                      </p>
                    </div>
                    {post.url ? (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 self-center text-[11px] text-brand-300 hover:text-white"
                      >
                        원본
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            )
          ) : active === 'upload' ? (
            uploads.length === 0 ? (
              <p className="py-10 text-center text-sm text-white/40">업로드된 내용이 없습니다.</p>
            ) : (
              <div className="divide-y divide-white/8">
                {uploads.map((item) => (
                  <div key={item.id} className="flex gap-3 py-3">
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/5">
                        <Download className="h-4 w-4 text-white/30" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{item.title || '제목 없음'}</p>
                      <p className="mt-1 text-[11px] text-white/40">
                        {item.type === 'short' ? '쇼츠' : '롱폼'} · {UPLOAD_STATUS[item.status] || item.status}
                        {item.platforms?.length ? ` · ${item.platforms.map(platformLabel).join(', ')}` : ''}
                        {item.created_at ? ` · ${formatDate(item.created_at)}` : ''}
                      </p>
                      {item.platform_urls && Object.keys(item.platform_urls).length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {Object.entries(item.platform_urls).map(([key, url]) =>
                            url ? (
                              <a
                                key={key}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-brand-300 hover:text-white"
                              >
                                {platformLabel(key)}
                              </a>
                            ) : null
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : groupedChannels.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/40">연결된 채널이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {groupedChannels.map(([platform, rows]) => (
                <section key={platform} className="rounded-xl bg-white/5 p-3">
                  <p className="mb-2 text-xs font-semibold text-white/70">
                    {platformLabel(platform)} · {rows.length}개
                  </p>
                  <div className="space-y-1.5">
                    {rows.map((row) => (
                      <div key={row.id} className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-white">{handleText(row)}</p>
                        {row.accountId && row.accountId !== row.handle.replace(/^@/, '') ? (
                          <p className="shrink-0 text-[11px] text-white/35">{row.accountId}</p>
                        ) : (
                          <p className="shrink-0 text-[11px] text-white/30">{formatDate(row.created_at)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function MemberActivityButton({
  userId,
  userName,
  tab,
  count,
  label,
}: {
  userId: string
  userName: string
  tab: ActivityTab
  count: number
  label: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${label} 상세 보기`}
        className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/55 ring-1 ring-transparent transition hover:bg-white/10 hover:text-white hover:ring-white/15"
      >
        {label} {count}
      </button>
      <MemberActivityModal
        open={open}
        tab={tab}
        userId={userId}
        userName={userName}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

