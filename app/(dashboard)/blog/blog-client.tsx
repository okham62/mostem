'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FileText,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Zap,
  Settings2,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlogPostRow, BlogTrendCard } from '@/lib/blog-types'
import { BLOG_PROVIDER_STATUS } from '@/lib/blog-providers'

type AccountRow = {
  id: string
  provider: string
  site_url: string
  username: string
  hasPassword?: boolean
}

type Preview = {
  title: string
  bodyHtml: string
  bodyMarkdown: string
  tags: string[]
  postId?: string | null
  persistError?: string | null
}

export function BlogClient() {
  const [cards, setCards] = useState<BlogTrendCard[]>([])
  const [posts, setPosts] = useState<BlogPostRow[]>([])
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [loadingTrends, setLoadingTrends] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState<'trends' | 'drafts' | 'accounts'>('trends')

  const [wpUrl, setWpUrl] = useState('')
  const [wpUser, setWpUser] = useState('')
  const [wpPass, setWpPass] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)

  const ping = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2500)
  }

  const loadTrends = useCallback(async (force = false) => {
    setLoadingTrends(true)
    setError('')
    try {
      const res = await fetch(`/api/blog/trends${force ? '?force=1' : ''}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '트렌드 로드 실패')
      setCards(data.cards ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '트렌드 로드 실패')
    } finally {
      setLoadingTrends(false)
    }
  }, [])

  const loadPosts = useCallback(async () => {
    const res = await fetch('/api/blog/posts', { cache: 'no-store' })
    const data = await res.json()
    setPosts(data.posts ?? [])
    if (data.error) setError(String(data.error))
  }, [])

  const loadAccounts = useCallback(async () => {
    const res = await fetch('/api/blog/accounts', { cache: 'no-store' })
    const data = await res.json()
    setAccounts(data.accounts ?? [])
  }, [])

  useEffect(() => {
    void loadTrends()
    void loadPosts()
    void loadAccounts()
  }, [loadTrends, loadPosts, loadAccounts])

  async function generate(card: BlogTrendCard, mode: 'seo' | 'home') {
    const key = `${card.keyword}:${mode}`
    setBusyKey(key)
    setError('')
    try {
      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: card.keyword,
          mode,
          relatedNews: card.relatedNews,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '생성 실패')
      setPreview({
        title: data.article.title,
        bodyHtml: data.article.bodyHtml,
        bodyMarkdown: data.article.bodyMarkdown,
        tags: data.article.tags ?? [],
        postId: data.post?.id ?? null,
        persistError: data.persistError ?? null,
      })
      await loadPosts()
      setTab('drafts')
      ping(mode === 'home' ? '홈판용 글 생성 완료' : 'SEO 글 생성 완료')
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성 실패')
    } finally {
      setBusyKey(null)
    }
  }

  async function publish(postId: string, status: 'draft' | 'publish') {
    setBusyKey(`pub:${postId}`)
    try {
      const res = await fetch('/api/blog/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '발행 실패')
      ping(status === 'publish' ? '워드프레스 발행 완료' : '워드프레스 임시저장 완료')
      await loadPosts()
    } catch (e) {
      setError(e instanceof Error ? e.message : '발행 실패')
    } finally {
      setBusyKey(null)
    }
  }

  async function saveWpAccount() {
    setSavingAccount(true)
    setError('')
    try {
      const res = await fetch('/api/blog/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'wordpress',
          site_url: wpUrl,
          username: wpUser,
          app_password: wpPass,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '저장 실패')
      setWpPass('')
      await loadAccounts()
      ping('WordPress 계정 연결됨')
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSavingAccount(false)
    }
  }

  async function enqueueExternal(provider: 'tistory' | 'naver', postId?: string) {
    const res = await fetch('/api/blog/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, postId, keyword: preview?.title || '' }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || '큐 등록 실패')
      return
    }
    ping(data.message || '큐에 등록됨')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Blog Hub</h1>
          <p className="mt-1 text-sm text-white/45">
            실시간 이슈 → SEO/홈판 글 생성 → 워드프레스 발행
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadTrends(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loadingTrends && 'animate-spin')} />
          트렌드 새로고침
        </button>
      </div>

      <div className="flex gap-2">
        {(
          [
            ['trends', '급상승 키워드'],
            ['drafts', '초안'],
            ['accounts', '계정·연동'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'h-10 rounded-lg px-3 text-sm font-semibold transition',
              tab === id ? 'mostem-filter-btn' : 'bg-white/5 text-white/60 hover:bg-white/10'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {toast ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {toast}
        </div>
      ) : null}

      {tab === 'trends' ? (
        loadingTrends && cards.length === 0 ? (
          <div className="py-16 text-center text-sm text-white/40">트렌드 불러오는 중…</div>
        ) : cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-sm text-white/40">
            키워드가 없습니다. 새로고침을 눌러 보세요.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => {
              const seoBusy = busyKey === `${card.keyword}:seo`
              const homeBusy = busyKey === `${card.keyword}:home`
              return (
                <div
                  key={`${card.source}-${card.keyword}`}
                  className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-white">{card.keyword}</h2>
                    <span className="shrink-0 rounded-md bg-white/5 px-2 py-0.5 text-[10px] uppercase text-white/40">
                      {card.source}
                    </span>
                  </div>
                  {card.traffic ? (
                    <p className="mb-2 text-xs text-gold">검색량 추정 {card.traffic}</p>
                  ) : null}
                  <p className="mb-3 text-xs text-white/45">
                    관련 뉴스 {card.newsCount} · 이미지 {card.imageCount}
                  </p>
                  <ul className="mb-4 space-y-1">
                    {card.relatedNews.slice(0, 2).map((n) => (
                      <li key={n.url} className="truncate text-[11px] text-white/35">
                        · {n.title}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={Boolean(busyKey)}
                      onClick={() => void generate(card, 'seo')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50"
                    >
                      {seoBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                      일반 SEO 글 생성
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busyKey)}
                      onClick={() => void generate(card, 'home')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gold/20 px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/30 disabled:opacity-50"
                    >
                      {homeBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                      홈판 추천글 생성
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : null}

      {tab === 'drafts' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/70">저장된 초안</h3>
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-white/40">
                아직 초안이 없습니다. 키워드에서 글을 생성하세요.
                <p className="mt-2 text-[11px] text-white/30">
                  또는{' '}
                  <Link href="/shopping" className="text-gold underline">
                    쇼핑 베스트
                  </Link>
                  에서 「블로그 초안」을 눌러 주세요.
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() =>
                    setPreview({
                      title: post.title,
                      bodyHtml: post.body_html,
                      bodyMarkdown: post.body_markdown,
                      tags: post.tags ?? [],
                      postId: post.id,
                    })
                  }
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 text-left hover:border-white/20"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="line-clamp-1 text-sm font-semibold text-white">{post.title}</span>
                    <span className="text-[10px] text-white/35">{post.status}</span>
                  </div>
                  <p className="text-[11px] text-white/40">
                    {post.mode} · {post.keyword}
                    {post.published_url ? ' · 발행됨' : ''}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            {preview ? (
              <>
                <h3 className="mb-2 text-lg font-bold text-white">{preview.title}</h3>
                {preview.persistError ? (
                  <p className="mb-2 text-xs text-amber-300">DB: {preview.persistError}</p>
                ) : null}
                <div className="mb-3 flex flex-wrap gap-1">
                  {preview.tags.map((tag) => (
                    <span key={tag} className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                      #{tag}
                    </span>
                  ))}
                </div>
                <div
                  className="prose prose-invert max-h-[480px] overflow-y-auto text-sm"
                  dangerouslySetInnerHTML={{ __html: preview.bodyHtml }}
                />
                {preview.postId ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={Boolean(busyKey)}
                      onClick={() => void publish(preview.postId!, 'draft')}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold"
                    >
                      <Send className="h-3.5 w-3.5" /> WP 임시저장
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busyKey)}
                      onClick={() => void publish(preview.postId!, 'publish')}
                      className="inline-flex items-center gap-1 rounded-lg bg-gold/20 px-3 py-2 text-xs font-semibold text-gold"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> WP 발행
                    </button>
                    <button
                      type="button"
                      onClick={() => void enqueueExternal('tistory', preview.postId || undefined)}
                      className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60"
                    >
                      티스토리 큐
                    </button>
                    <button
                      type="button"
                      onClick={() => void enqueueExternal('naver', preview.postId || undefined)}
                      className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60"
                    >
                      네이버 큐
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="py-20 text-center text-sm text-white/35">초안을 선택하면 미리보기가 표시됩니다.</div>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'accounts' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Settings2 className="h-4 w-4" /> WordPress 연결
            </div>
            <p className="text-xs text-white/40">
              사이트 URL + 사용자명 + Application Password 필요. Cron 무인 발행도 이 계정을 사용합니다.
            </p>
            <input
              value={wpUrl}
              onChange={(e) => setWpUrl(e.target.value)}
              placeholder="https://your-site.com"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            />
            <input
              value={wpUser}
              onChange={(e) => setWpUser(e.target.value)}
              placeholder="username"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            />
            <input
              value={wpPass}
              onChange={(e) => setWpPass(e.target.value)}
              placeholder="Application Password"
              type="password"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={savingAccount}
              onClick={() => void saveWpAccount()}
              className="rounded-lg bg-gold/20 px-3 py-2 text-xs font-semibold text-gold disabled:opacity-50"
            >
              {savingAccount ? '확인 중…' : '연결 저장'}
            </button>
            <ul className="space-y-2 pt-2">
              {accounts.map((a) => (
                <li key={a.id} className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60">
                  <span className="font-semibold text-white/80">{a.provider}</span> · {a.site_url} · {a.username}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white">발행 채널 상태</h3>
            {Object.values(BLOG_PROVIDER_STATUS).map((p) => (
              <div key={p.id} className="rounded-xl border border-white/10 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{p.label}</span>
                  <span className={cn('text-[10px]', p.ready ? 'text-emerald-400' : 'text-white/35')}>
                    {p.ready ? '준비됨' : '후속'}
                  </span>
                </div>
                <p className="text-[11px] text-white/40">{p.notes}</p>
              </div>
            ))}
            <p className="text-[11px] text-white/30">
              Cron: 매일 09:00 UTC <code className="text-white/50">/api/cron/blog</code> ·{' '}
              <code className="text-white/50">CRON_SECRET</code> /{' '}
              <code className="text-white/50">TELEGRAM_BOT_TOKEN</code> 환경변수
            </p>
            <a
              href="https://www.mostem.kr/privacy"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70"
            >
              개인정보처리방침 <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ) : null}
    </div>
  )
}
