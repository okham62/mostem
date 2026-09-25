'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Zap,
  Settings2,
  ExternalLink,
  CalendarClock,
  ShoppingBag,
  Home,
  PenLine,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  BlogCategoryScheduleRow,
  BlogFolderWatcherRow,
  BlogMode,
  BlogPostRow,
  BlogTrendCard,
  Weekday,
} from '@/lib/blog-types'
import { BLOG_PROVIDER_STATUS } from '@/lib/blog-providers'
import { WEEKDAY_LABELS } from '@/lib/blog-schedule'
import { KeywordInsightPanel } from './keyword-insight-panel'

type AccountRow = {
  id: string
  provider: string
  site_url: string
  username: string
  hasPassword?: boolean
  meta?: Record<string, unknown>
}

type Preview = {
  title: string
  bodyHtml: string
  bodyMarkdown: string
  tags: string[]
  postId?: string | null
  persistError?: string | null
}

type WriteMode = 'seo' | 'home' | 'product'
type SubTab = 'write' | 'drafts' | 'folders' | 'ops'
type HubView = 'dashboard' | 'write' | 'drafts' | 'folders' | 'ops'

const HUB_NAV: Array<{ id: HubView; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'write', label: '글 발행', icon: PenLine },
  { id: 'drafts', label: '초안', icon: FileText },
  { id: 'folders', label: '폴더', icon: FolderOpen },
  { id: 'ops', label: '설정', icon: Settings2 },
]

const MODES: Array<{
  id: WriteMode
  title: string
  subtitle: string
  hint: string
  icon: typeof FileText
  accent: string
}> = [
  {
    id: 'seo',
    title: '네이버블로그 일반글 쓰기',
    subtitle: 'SEO · 정보성',
    hint: '급상승 키워드로 H2/H3 구조의 일반 검색용 글을 만듭니다.',
    icon: FileText,
    accent: 'from-sky-500/20 to-blue-600/10 border-sky-400/30',
  },
  {
    id: 'home',
    title: '네이버블로그 홈판글 쓰기',
    subtitle: '홈 · 추천 피드',
    hint: '후킹 제목·스토리텔링 톤으로 홈판 추천을 노리는 글을 만듭니다.',
    icon: Home,
    accent: 'from-fuchsia-500/20 to-rose-600/10 border-fuchsia-400/30',
  },
  {
    id: 'product',
    title: '네이버블로그 쇼핑글 쓰기',
    subtitle: '리뷰 · 상품',
    hint: '쇼핑 베스트 상품을 골라 리뷰/추천 글을 만들거나, 상품 폴더 이미지로 작성합니다.',
    icon: ShoppingBag,
    accent: 'from-amber-500/20 to-orange-600/10 border-amber-400/30',
  },
]

function modeLabel(mode: string) {
  if (mode === 'home') return '홈판'
  if (mode === 'product') return '쇼핑'
  if (mode === 'folder') return '폴더'
  return '일반'
}

export function BlogClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startView] = useTransition()
  const modeParam = searchParams.get('mode')
  const urlMode: WriteMode | null =
    modeParam === 'seo' || modeParam === 'home' || modeParam === 'product' ? modeParam : null
  const viewParam = searchParams.get('view')
  const urlView: HubView =
    viewParam === 'write' ||
    viewParam === 'drafts' ||
    viewParam === 'folders' ||
    viewParam === 'ops'
      ? viewParam
      : 'dashboard'
  const [hubView, setHubView] = useState<HubView>(urlView)
  const [mode, setMode] = useState<WriteMode | null>(urlMode)

  useEffect(() => {
    setHubView(urlView)
  }, [urlView])

  useEffect(() => {
    setMode(urlMode)
  }, [urlMode])

  const [cards, setCards] = useState<BlogTrendCard[]>([])
  const [posts, setPosts] = useState<BlogPostRow[]>([])
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [schedules, setSchedules] = useState<BlogCategoryScheduleRow[]>([])
  const [folders, setFolders] = useState<BlogFolderWatcherRow[]>([])
  const [loadingTrends, setLoadingTrends] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [setupHint, setSetupHint] = useState('')
  const [subTab, setSubTab] = useState<SubTab>('write')

  const [wpUrl, setWpUrl] = useState('')
  const [wpUser, setWpUser] = useState('')
  const [wpPass, setWpPass] = useState('')
  const [naverUser, setNaverUser] = useState('')
  const [naverBlogId, setNaverBlogId] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)

  const [catAccountId, setCatAccountId] = useState('')
  const [catName, setCatName] = useState('')
  const [catBlogId, setCatBlogId] = useState('')
  const [openDow, setOpenDow] = useState<Weekday>(5)
  const [openTime, setOpenTime] = useState('17:00')
  const [closeDow, setCloseDow] = useState<Weekday>(0)
  const [closeTime, setCloseTime] = useState('21:00')

  const [folderPath, setFolderPath] = useState('')
  const [folderLabel, setFolderLabel] = useState('')
  const [pickingFolder, setPickingFolder] = useState(false)
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null)

  const ping = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2500)
  }

  const selectMode = (next: WriteMode | null) => {
    setPreview(null)
    setSubTab('write')
    setMode(next)
    setHubView('write')
    startView(() => {
      router.push(next ? `/blog?mode=${next}` : '/blog?view=write', { scroll: false })
    })
  }

  const selectHubView = (next: HubView) => {
    setPreview(null)
    setHubView(next)
    if (next !== 'write') setMode(null)
    startView(() => {
      router.push(next === 'dashboard' ? '/blog' : `/blog?view=${next}`, { scroll: false })
    })
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
    if (data.error) {
      const msg = String(data.error)
      if (/blog_posts|schema cache|Could not find the table/i.test(msg)) {
        setSetupHint(
          '글 발행·초안 저장을 쓰려면 Supabase SQL에서 blog_hub.sql → blog_hub_agent.sql 을 실행해 주세요.'
        )
      }
    }
  }, [])

  const loadAccounts = useCallback(async () => {
    const res = await fetch('/api/blog/accounts', { cache: 'no-store' })
    const data = await res.json()
    setAccounts(data.accounts ?? [])
    if (data.error && /blog_accounts|schema cache|Could not find the table/i.test(String(data.error))) {
      setSetupHint(
        '글 발행·초안 저장을 쓰려면 Supabase SQL에서 blog_hub.sql → blog_hub_agent.sql 을 실행해 주세요.'
      )
    }
  }, [])

  const loadSchedules = useCallback(async () => {
    const res = await fetch('/api/blog/schedules', { cache: 'no-store' })
    const data = await res.json()
    setSchedules(data.schedules ?? [])
    if (data.error && /schema cache|Could not find the table|blog_category_schedules/i.test(String(data.error))) {
      setSetupHint(
        '글 발행·초안 저장을 쓰려면 Supabase SQL에서 blog_hub.sql → blog_hub_agent.sql 을 실행해 주세요.'
      )
      return
    }
    if (data.error) setError(String(data.error))
  }, [])

  const loadFolders = useCallback(async () => {
    const res = await fetch('/api/blog/folders', { cache: 'no-store' })
    const data = await res.json()
    setFolders(data.folders ?? [])
    if (data.error && /schema cache|Could not find the table|blog_folder/i.test(String(data.error))) {
      setSetupHint(
        '글 발행·초안 저장을 쓰려면 Supabase SQL에서 blog_hub.sql → blog_hub_agent.sql 을 실행해 주세요.'
      )
      return
    }
    if (data.error) setError(String(data.error))
  }, [])

  useEffect(() => {
    void loadTrends()
    void loadPosts()
    void loadAccounts()
    void loadSchedules()
    void loadFolders()
  }, [loadTrends, loadPosts, loadAccounts, loadSchedules, loadFolders])

  useEffect(() => {
    let alive = true
    async function pingAgent() {
      try {
        const res = await fetch('http://127.0.0.1:39217/health', { cache: 'no-store' })
        if (!alive) return
        setAgentOnline(res.ok)
      } catch {
        if (alive) setAgentOnline(false)
      }
    }
    void pingAgent()
    const timer = window.setInterval(() => void pingAgent(), 8000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [])

  const AGENT_PICKER = 'http://127.0.0.1:39217/pick-folder'

  async function pickLocalFolder() {
    setPickingFolder(true)
    setError('')
    try {
      const res = await fetch(AGENT_PICKER, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '폴더 선택 실패')
      if (!data.path) {
        ping('폴더 선택이 취소되었습니다')
        return
      }
      setFolderPath(String(data.path))
      if (!folderLabel) {
        const parts = String(data.path).replace(/[\\/]+$/, '').split(/[\\/]/)
        setFolderLabel(parts[parts.length - 1] || '')
      }
      setAgentOnline(true)
      ping('폴더가 선택되었습니다')
    } catch {
      setAgentOnline(false)
      setError(
        '로컬 에이전트가 꺼져 있습니다. PC에서 workers/blog-agent 를 실행한 뒤 「폴더 찾아보기」를 다시 눌러 주세요.'
      )
    } finally {
      setPickingFolder(false)
    }
  }

  const modePosts = useMemo(() => {
    if (!mode) return posts
    return posts.filter((p) => {
      if (mode === 'seo') return p.mode === 'seo' || p.mode === 'folder'
      return p.mode === mode
    })
  }, [posts, mode])

  const modeFolders = useMemo(() => {
    if (!mode) return folders
    return folders.filter((f) => {
      if (mode === 'seo') return f.mode === 'seo' || f.mode === 'folder' || !f.mode
      return f.mode === mode
    })
  }, [folders, mode])

  const activeMeta = MODES.find((m) => m.id === mode)

  async function generate(card: BlogTrendCard, writeMode: 'seo' | 'home') {
    const key = `${card.keyword}:${writeMode}`
    setBusyKey(key)
    setError('')
    try {
      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: card.keyword,
          mode: writeMode,
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
      setSubTab('drafts')
      ping(writeMode === 'home' ? '홈판용 글 생성 완료' : '일반글 생성 완료')
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

  async function saveNaverAccount() {
    const blogId = naverBlogId.trim()
    if (!blogId) {
      setError('네이버 blogId를 입력하세요 (계정 개수 제한 없음)')
      return
    }
    setSavingAccount(true)
    setError('')
    try {
      const res = await fetch('/api/blog/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'naver',
          blogId,
          username: naverUser.trim() || blogId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '저장 실패')
      setNaverBlogId('')
      setNaverUser('')
      await loadAccounts()
      ping(`네이버 계정 추가됨 (총 ${accounts.filter((a) => a.provider === 'naver').length + 1}개)`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSavingAccount(false)
    }
  }

  async function removeAccount(id: string) {
    await fetch(`/api/blog/accounts?id=${id}`, { method: 'DELETE' })
    await loadAccounts()
    ping('계정 삭제됨')
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

  async function addSchedule() {
    if (!catName.trim()) {
      setError('카테고리명을 입력하세요')
      return
    }
    setBusyKey('sched')
    try {
      const res = await fetch('/api/blog/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName: catName,
          blogId: catBlogId,
          accountId: catAccountId || null,
          openDow,
          openTime,
          closeDow,
          closeTime,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '저장 실패')
      setCatName('')
      await loadSchedules()
      ping('카테고리 스케줄 저장됨')
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setBusyKey(null)
    }
  }

  async function toggleSchedule(id: string, enabled: boolean) {
    await fetch('/api/blog/schedules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    })
    await loadSchedules()
  }

  async function removeSchedule(id: string) {
    await fetch(`/api/blog/schedules?id=${id}`, { method: 'DELETE' })
    await loadSchedules()
  }

  async function addFolder() {
    if (!folderPath.trim() || !mode) {
      setError('로컬 폴더 경로를 입력하세요')
      return
    }
    setBusyKey('folder')
    try {
      const folderMode: BlogMode = mode === 'seo' ? 'folder' : mode
      const res = await fetch('/api/blog/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localPath: folderPath,
          label: folderLabel || activeMeta?.title || '',
          mode: folderMode,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '저장 실패')
      setFolderPath('')
      setFolderLabel('')
      await loadFolders()
      ping('폴더 감시 등록됨')
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setBusyKey(null)
    }
  }

  async function toggleFolder(id: string, enabled: boolean) {
    await fetch('/api/blog/folders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    })
    await loadFolders()
  }

  async function removeFolder(id: string) {
    await fetch(`/api/blog/folders?id=${id}`, { method: 'DELETE' })
    await loadFolders()
  }

  const dowOptions = WEEKDAY_LABELS.map((label, value) => ({ label, value: value as Weekday }))
  const naverAccounts = accounts.filter((a) => a.provider === 'naver')

  if (!mode) {
    return (
      <div className="flex min-h-[70vh] gap-4">
        <aside className="hidden w-[72px] shrink-0 flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] py-3 md:flex">
          {HUB_NAV.map((item) => {
            const Icon = item.icon
            const active = hubView === item.id
            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => selectHubView(item.id)}
                className={cn(
                  'flex w-14 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition',
                  active
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'text-white/40 hover:bg-white/5 hover:text-white/70'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </aside>

        <div className="min-w-0 flex-1 space-y-4 overflow-x-hidden">
          <div className="flex gap-1 overflow-x-auto md:hidden">
            {HUB_NAV.map((item) => {
              const active = hubView === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectHubView(item.id)}
                  className={cn(
                    'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold',
                    active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/45'
                  )}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          {error ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {error}
            </div>
          ) : null}
          {setupHint && hubView !== 'dashboard' ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/50">
              {setupHint}
            </div>
          ) : null}
          {toast ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {toast}
            </div>
          ) : null}

          {hubView === 'dashboard' ? (
            <KeywordInsightPanel naverBlogConnected={naverAccounts.length > 0} />
          ) : null}

          {hubView === 'write' ? (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white">프로젝트 — 글 발행하기</h1>
                <p className="mt-1 text-sm text-white/45">
                  각 항목별로 글쓰기 방식을 선택한 뒤 플랫폼·스타일·발행까지 진행합니다.
                </p>
              </div>

              <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white">네이버 블로그 계정</h2>
                    <p className="mt-1 text-xs text-white/45">개수 제한 없음 · blogId마다 추가</p>
                  </div>
                  <div
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-semibold',
                      naverAccounts.length > 0
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-white/8 text-white/45'
                    )}
                  >
                    {naverAccounts.length > 0 ? `연결됨 ${naverAccounts.length}개` : '연결 안 됨'}
                  </div>
                </div>
                <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    value={naverBlogId}
                    onChange={(e) => setNaverBlogId(e.target.value)}
                    placeholder="blogId (필수)"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
                  />
                  <input
                    value={naverUser}
                    onChange={(e) => setNaverUser(e.target.value)}
                    placeholder="표시 이름 (선택)"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={savingAccount}
                    onClick={() => void saveNaverAccount()}
                    className="rounded-xl bg-gold/20 px-4 py-2.5 text-sm font-semibold text-gold hover:bg-gold/30 disabled:opacity-50"
                  >
                    {savingAccount ? '추가 중…' : '계정 추가'}
                  </button>
                </div>
                {naverAccounts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/40">
                    아직 연결된 네이버 블로그가 없습니다.
                  </div>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {naverAccounts.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                            <p className="truncate text-sm font-semibold text-white">{a.username}</p>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-white/40">{a.site_url}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void removeAccount(a.id)}
                          className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-red-300/80 hover:bg-red-500/15"
                        >
                          연결 해제
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-white/70">글감 · 글쓰기 방식</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {MODES.map((item) => {
                    const Icon = item.icon
                    const count = posts.filter((p) =>
                      item.id === 'seo' ? p.mode === 'seo' || p.mode === 'folder' : p.mode === item.id
                    ).length
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectMode(item.id)}
                        className={cn(
                          'flex min-h-[180px] flex-col rounded-3xl border bg-gradient-to-br p-5 text-left transition hover:scale-[1.01]',
                          item.accent
                        )}
                      >
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-white">{item.title}</h3>
                        <p className="mt-1 text-xs font-semibold text-white/55">{item.subtitle}</p>
                        <p className="mt-3 flex-1 text-sm leading-relaxed text-white/65">{item.hint}</p>
                        <p className="mt-4 text-[11px] text-white/40">초안 {count}개 · 시작하기 →</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {hubView === 'drafts' ? (
            <div className="space-y-4">
              <h1 className="text-xl font-bold text-white">초안</h1>
              {posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-sm text-white/40">
                  아직 초안이 없습니다. 글 발행에서 만들어 보세요.
                </div>
              ) : (
                <ul className="space-y-2">
                  {posts.slice(0, 40).map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{p.title || p.keyword}</p>
                        <p className="mt-0.5 text-[11px] text-white/40">
                          {modeLabel(p.mode)} · {p.status} · {new Date(p.created_at).toLocaleString('ko-KR')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {p.provider === 'wordpress' || p.status === 'draft' ? (
                          <button
                            type="button"
                            onClick={() => void publish(p.id, 'publish')}
                            className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"
                          >
                            발행
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => selectMode(p.mode === 'home' || p.mode === 'product' ? p.mode : 'seo')}
                          className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] text-white/70"
                        >
                          열기
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {hubView === 'folders' ? (
            <div className="space-y-4">
              <h1 className="text-xl font-bold text-white">폴더 감시</h1>
              <p className="text-sm text-white/45">
                폴더 이미지 글쓰기는 글 발행 → 방식 선택 후 「폴더 이미지」 탭에서 등록합니다.
              </p>
              {folders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-white/40">
                  등록된 폴더가 없습니다.
                </div>
              ) : (
                <ul className="space-y-2">
                  {folders.map((f) => (
                    <li
                      key={f.id}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
                    >
                      <p className="font-semibold text-white">{f.label || f.local_path}</p>
                      <p className="mt-1 text-[11px] text-white/40">
                        {f.local_path} · {f.enabled ? 'ON' : 'OFF'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => selectHubView('write')}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white/80"
              >
                글 발행에서 폴더 등록 →
              </button>
            </div>
          ) : null}

          {hubView === 'ops' ? (
            <div className="space-y-5">
              <h1 className="text-xl font-bold text-white">블로그 설정</h1>
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h2 className="mb-3 text-sm font-semibold">WordPress</h2>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    value={wpUrl}
                    onChange={(e) => setWpUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  />
                  <input
                    value={wpUser}
                    onChange={(e) => setWpUser(e.target.value)}
                    placeholder="username"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  />
                  <input
                    value={wpPass}
                    onChange={(e) => setWpPass(e.target.value)}
                    placeholder="Application Password"
                    type="password"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  disabled={savingAccount}
                  onClick={() => void saveWpAccount()}
                  className="mt-3 rounded-xl bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-300"
                >
                  WordPress 연결
                </button>
                <ul className="mt-3 space-y-1">
                  {accounts
                    .filter((a) => a.provider === 'wordpress')
                    .map((a) => (
                      <li key={a.id} className="flex justify-between text-xs text-white/55">
                        <span>
                          {a.username} · {a.site_url}
                        </span>
                        <button type="button" onClick={() => void removeAccount(a.id)} className="text-rose-300">
                          삭제
                        </button>
                      </li>
                    ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h2 className="mb-2 text-sm font-semibold">네이버 블로그</h2>
                <p className="mb-3 text-xs text-white/40">
                  연결 {naverAccounts.length}개 · 글 발행 탭에서도 추가할 수 있습니다.
                </p>
                <button
                  type="button"
                  onClick={() => selectHubView('write')}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs"
                >
                  계정 관리로 이동
                </button>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/45">
                <p>티스토리: {BLOG_PROVIDER_STATUS.tistory.notes}</p>
                <p className="mt-1">네이버 자동발행: {BLOG_PROVIDER_STATUS.naver.notes}</p>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => selectMode(null)}
            className="mb-2 inline-flex items-center gap-1 text-xs text-white/45 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 글 발행 홈
          </button>
          <h1 className="text-xl font-bold text-white">{activeMeta?.title}</h1>
          <p className="mt-1 text-sm text-white/45">{activeMeta?.hint}</p>
        </div>
        {(mode === 'seo' || mode === 'home') && (
          <button
            type="button"
            onClick={() => void loadTrends(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loadingTrends && 'animate-spin')} />
            트렌드 새로고침
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['write', mode === 'product' ? '쇼핑에서 쓰기' : '키워드로 쓰기'],
            ['drafts', '초안'],
            ['folders', '폴더 이미지'],
            ['ops', '운영'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={cn(
              'h-10 rounded-lg px-3 text-sm font-semibold transition',
              subTab === id ? 'mostem-filter-btn' : 'bg-white/5 text-white/60 hover:bg-white/10'
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

      {subTab === 'write' && (mode === 'seo' || mode === 'home') ? (
        loadingTrends && cards.length === 0 ? (
          <div className="py-16 text-center text-sm text-white/40">트렌드 불러오는 중…</div>
        ) : cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-sm text-white/40">
            키워드가 없습니다. 새로고침을 눌러 보세요.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => {
              const busy = busyKey === `${card.keyword}:${mode}`
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
                  <button
                    type="button"
                    disabled={Boolean(busyKey)}
                    onClick={() => void generate(card, mode)}
                    className={cn(
                      'inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50',
                      mode === 'home'
                        ? 'bg-gold/20 text-gold hover:bg-gold/30'
                        : 'bg-white/10 text-white hover:bg-white/15'
                    )}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : mode === 'home' ? (
                      <Zap className="h-3.5 w-3.5" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    {mode === 'home' ? '홈판글 생성' : '일반글 생성'}
                  </button>
                </div>
              )
            })}
          </div>
        )
      ) : null}

      {subTab === 'write' && mode === 'product' ? (
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
          <h3 className="text-base font-bold text-white">쇼핑 베스트에서 상품 고르기</h3>
          <p className="mt-2 text-sm text-white/50">
            네이버 쇼핑 급상승·인기 상품을 보고 「블로그 초안」을 누르면 쇼핑글 모드로 초안이 만들어집니다.
          </p>
          <Link
            href="/shopping"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold/20 px-4 py-2.5 text-sm font-semibold text-gold hover:bg-gold/30"
          >
            <ShoppingBag className="h-4 w-4" /> 쇼핑 베스트 열기
          </Link>
          <p className="mt-4 text-xs text-white/35">
            상품 사진만으로 쓰고 싶다면 「폴더 이미지」 탭에 로컬 경로를 등록하세요.
          </p>
        </div>
      ) : null}

      {subTab === 'drafts' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/70">
              {activeMeta?.title} 초안 ({modePosts.length})
            </h3>
            {modePosts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-white/40">
                이 모드의 초안이 아직 없습니다.
              </div>
            ) : (
              modePosts.map((post) => (
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
                    {modeLabel(post.mode)} · {post.keyword}
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

      {subTab === 'folders' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <FolderOpen className="h-4 w-4" /> 로컬 폴더 이미지 → AI 글
              </div>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  agentOnline ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/8 text-white/40'
                )}
              >
                {agentOnline == null ? '에이전트 확인 중' : agentOnline ? '에이전트 연결됨' : '에이전트 꺼짐'}
              </span>
            </div>
            <p className="text-xs text-white/40">
              「폴더 찾아보기」로 PC에서 직접 선택합니다. (브라우저 보안상 경로 타이핑 대신 로컬 에이전트 창을
              사용합니다)
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={pickingFolder}
                onClick={() => void pickLocalFolder()}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
              >
                {pickingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
                폴더 찾아보기
              </button>
              <button
                type="button"
                disabled={busyKey === 'folder' || !folderPath.trim()}
                onClick={() => void addFolder()}
                className="rounded-xl bg-gold/20 px-3 py-2.5 text-sm font-semibold text-gold disabled:opacity-50"
              >
                이 모드에 등록
              </button>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-white/35">선택된 경로</p>
              <p className="mt-1 break-all text-sm text-white/85">
                {folderPath || '아직 선택하지 않았습니다'}
              </p>
            </div>
            <input
              value={folderLabel}
              onChange={(e) => setFolderLabel(e.target.value)}
              placeholder="표시 이름 (선택 · 자동 채움)"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            {modeFolders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-white/40">
                이 모드에 등록된 폴더가 없습니다.
              </div>
            ) : (
              modeFolders.map((f) => (
                <div
                  key={f.id}
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 text-sm"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-semibold text-white">{f.label || f.local_path}</span>
                    <span className={cn('text-[10px]', f.enabled ? 'text-emerald-400' : 'text-white/35')}>
                      {f.enabled ? '감시중' : '중지'}
                    </span>
                  </div>
                  <p className="break-all text-[11px] text-white/45">{f.local_path}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleFolder(f.id, !f.enabled)}
                      className="rounded-lg bg-white/10 px-2 py-1 text-[11px]"
                    >
                      {f.enabled ? '중지' : '시작'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeFolder(f.id)}
                      className="rounded-lg bg-red-500/15 px-2 py-1 text-[11px] text-red-200"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {subTab === 'ops' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <CalendarClock className="h-4 w-4" /> 네이버 카테고리 On/Off
            </div>
            <p className="text-xs text-white/40">
              예: 금 17:00 공개 → 일 21:00 비공개. 예약 시각에 PC + 로컬 에이전트가 켜져 있어야 합니다.
            </p>
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="카테고리명 (예: 폰케이스)"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            />
            <select
              value={catAccountId}
              onChange={(e) => {
                setCatAccountId(e.target.value)
                const acc = accounts.find((a) => a.id === e.target.value)
                const blogId = String(acc?.meta?.blogId || '')
                if (blogId) setCatBlogId(blogId)
              }}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
            >
              <option value="">네이버 계정 선택 (선택)</option>
              {accounts
                .filter((a) => a.provider === 'naver')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.username} · {a.site_url}
                  </option>
                ))}
            </select>
            <input
              value={catBlogId}
              onChange={(e) => setCatBlogId(e.target.value)}
              placeholder="네이버 blogId (선택)"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-white/45">
                공개 요일
                <select
                  value={openDow}
                  onChange={(e) => setOpenDow(Number(e.target.value) as Weekday)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
                >
                  {dowOptions.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] text-white/45">
                공개 시각
                <input
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-[11px] text-white/45">
                비공개 요일
                <select
                  value={closeDow}
                  onChange={(e) => setCloseDow(Number(e.target.value) as Weekday)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm text-white"
                >
                  {dowOptions.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] text-white/45">
                비공개 시각
                <input
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={busyKey === 'sched'}
              onClick={() => void addSchedule()}
              className="rounded-lg bg-gold/20 px-3 py-2 text-xs font-semibold text-gold disabled:opacity-50"
            >
              스케줄 추가
            </button>
            <div className="space-y-2 pt-2">
              {schedules.map((s) => (
                <div key={s.id} className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-white">{s.category_name}</span>
                    <span>{s.enabled ? 'ON' : 'OFF'}</span>
                  </div>
                  <p>
                    공개 {WEEKDAY_LABELS[s.open_dow]} {s.open_time} · 비공개 {WEEKDAY_LABELS[s.close_dow]}{' '}
                    {s.close_time}
                  </p>
                  <div className="mt-1 flex gap-2">
                    <button type="button" onClick={() => void toggleSchedule(s.id, !s.enabled)}>
                      {s.enabled ? '비활성' : '활성'}
                    </button>
                    <button type="button" onClick={() => void removeSchedule(s.id)}>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Settings2 className="h-4 w-4" /> 계정 · 로컬 에이전트
            </div>
            <input
              value={wpUrl}
              onChange={(e) => setWpUrl(e.target.value)}
              placeholder="WordPress URL"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
            />
            <input
              value={wpUser}
              onChange={(e) => setWpUser(e.target.value)}
              placeholder="WP username"
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
              className="rounded-lg bg-gold/20 px-3 py-2 text-xs font-semibold text-gold"
            >
              WP 연결 저장
            </button>

            <div className="border-t border-white/10 pt-3">
              <p className="mb-1 text-sm font-semibold text-white">네이버 블로그 계정</p>
              <p className="mb-2 text-[11px] text-white/40">개수 제한 없음 · blogId마다 추가</p>
              <input
                value={naverBlogId}
                onChange={(e) => setNaverBlogId(e.target.value)}
                placeholder="네이버 blogId (필수)"
                className="mb-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                value={naverUser}
                onChange={(e) => setNaverUser(e.target.value)}
                placeholder="표시 이름 (선택)"
                className="mb-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={savingAccount}
                onClick={() => void saveNaverAccount()}
                className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold"
              >
                네이버 계정 추가
              </button>
              <ul className="mt-3 space-y-2">
                {accounts.filter((a) => a.provider === 'naver').length === 0 ? (
                  <li className="text-[11px] text-white/35">등록된 네이버 계정이 없습니다.</li>
                ) : (
                  accounts
                    .filter((a) => a.provider === 'naver')
                    .map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-[11px] text-white/70"
                      >
                        <span className="min-w-0 truncate">
                          <span className="font-semibold text-white">{a.username}</span>
                          <span className="text-white/35"> · {a.site_url}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => void removeAccount(a.id)}
                          className="shrink-0 text-red-300/80 hover:text-red-200"
                        >
                          삭제
                        </button>
                      </li>
                    ))
                )}
              </ul>
            </div>

            <p className="text-[11px] text-white/40">
              에이전트: <code className="text-white/60">workers/blog-agent</code> ·{' '}
              <code className="text-white/60">npm run blog-agent</code>
            </p>
            {Object.values(BLOG_PROVIDER_STATUS).map((p) => (
              <div key={p.id} className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-white/45">
                <span className="font-semibold text-white/80">{p.label}</span> · {p.notes}
              </div>
            ))}
            <ul className="space-y-1 text-[11px] text-white/40">
              {accounts
                .filter((a) => a.provider !== 'naver')
                .map((a) => (
                  <li key={a.id} className="flex justify-between gap-2">
                    <span>
                      {a.provider} · {a.site_url} · {a.username}
                    </span>
                    <button type="button" onClick={() => void removeAccount(a.id)} className="text-red-300/70">
                      삭제
                    </button>
                  </li>
                ))}
            </ul>
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
