'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
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

type NaverLinkStatus = {
  state: 'checking' | 'linked' | 'missing' | 'error'
  blogName?: string
}

function splitTitleText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  return (lines.length <= 1 ? lines.flatMap((line) => line.split(/\s+/)) : lines)
    .map((line) => line.trim())
    .filter(Boolean)
}

function titleFieldValue(text: string) {
  if (text.includes('\n')) return text.replace(/\r\n/g, '\n')
  return splitTitleText(text).join('\n')
}

function toLocalInput(date: Date) {
  const copy = new Date(date)
  copy.setSeconds(0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${copy.getFullYear()}-${pad(copy.getMonth() + 1)}-${pad(copy.getDate())}T${pad(copy.getHours())}:${pad(copy.getMinutes())}`
}

function parseSchedule(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function defaultTodaySlot(now = new Date()) {
  const evening = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0, 0)
  if (evening.getTime() >= now.getTime() + 60_000) return evening
  const soon = new Date(now.getTime() + 60_000)
  soon.setSeconds(0, 0)
  const minute = Math.ceil(soon.getMinutes() / 10) * 10
  soon.setMinutes(0)
  soon.setHours(soon.getHours() + Math.floor(minute / 60))
  soon.setMinutes(minute % 60)
  return soon
}

function formatSchedule(value: string) {
  const date = parseSchedule(value)
  if (!date) return ''
  const hour = date.getHours()
  const ampm = hour < 12 ? '오전' : '오후'
  const h12 = hour % 12 || 12
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${ampm} ${h12}:${minute}`
}

const WHEEL_HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const WHEEL_MINUTES = [0, 10, 20, 30, 40, 50]

function stepWheel(values: number[], current: number, direction: 1 | -1, disabled: (item: number) => boolean) {
  const start = values.indexOf(current)
  const origin = start < 0 ? 0 : start
  for (let offset = 1; offset <= values.length; offset += 1) {
    const next = values[(origin + direction * offset + values.length * 2) % values.length]
    if (!disabled(next)) return next
  }
  return current
}

function TimeWheel({
  label,
  values,
  value,
  format,
  disabled,
  onPick,
  tone,
}: {
  label: string
  values: number[]
  value: number
  format: (item: number) => string
  disabled: (item: number) => boolean
  onPick: (item: number) => void
  tone: 'blue' | 'white'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const pickRef = useRef(onPick)
  const disabledRef = useRef(disabled)
  pickRef.current = onPick
  disabledRef.current = disabled
  const index = values.indexOf(value)
  const at = index < 0 ? 0 : index
  const around = [-1, 0, 1].map((offset) => values[(at + offset + values.length) % values.length])

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (event.deltaY === 0) return
      pickRef.current(stepWheel(values, value, event.deltaY > 0 ? 1 : -1, disabledRef.current))
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [value, values])

  function move(direction: 1 | -1) {
    onPick(stepWheel(values, value, direction, disabled))
  }

  return (
    <div
      ref={ref}
      className="touch-none select-none"
      onPointerDown={(event) => {
        const startY = event.clientY
        event.currentTarget.setPointerCapture(event.pointerId)
        event.currentTarget.dataset.dragY = String(startY)
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
        const startY = Number(event.currentTarget.dataset.dragY || event.clientY)
        const delta = event.clientY - startY
        if (Math.abs(delta) < 22) return
        move(delta > 0 ? -1 : 1)
        event.currentTarget.dataset.dragY = String(event.clientY)
      }}
    >
      <p className="mb-1 text-center text-[10px] text-white/35">{label}</p>
      <div className="overflow-hidden rounded-2xl bg-black/20 py-1">
        {around.map((item, row) => {
          const current = row === 1
          const blocked = disabled(item)
          return (
            <div
              key={`${row}-${item}`}
              className={cn(
                'mx-2 flex h-8 items-center justify-center rounded-lg text-sm',
                current && tone === 'blue' && 'bg-[#0a84ff] font-medium text-white',
                current && tone === 'white' && 'bg-white font-medium text-neutral-950',
                !current && (blocked ? 'text-white/15' : 'text-white/35')
              )}
            >
              {format(item)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScheduleQuickPick({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const now = new Date()
  const selected = parseSchedule(value) ?? defaultTodaySlot(now)
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const [cursor, setCursor] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))

  useEffect(() => {
    if (value) return
    onChange(toLocalInput(defaultTodaySlot()))
  }, [value, onChange])

  function sameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  }

  function apply(date: Date, hour24: number, minute: number) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour24, minute, 0, 0)
    if (next.getTime() < now.getTime() + 60_000) return
    onChange(toLocalInput(next))
  }

  const hour24 = selected?.getHours() ?? 18
  const minute = selected?.getMinutes() ?? 0
  const isPm = hour24 >= 12
  const hour12 = hour24 % 12 || 12
  const baseDate = selected
  const firstWeekday = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay()
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const cells = [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)]

  return (
    <div className="overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
      <div className="px-4 pb-2 pt-3">
        <p className="text-[22px] font-medium tracking-tight text-white">{formatSchedule(toLocalInput(selected))}</p>
      </div>
      <div className="px-3 pb-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            aria-label="이전 달"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="h-7 w-7 rounded-full text-sm text-white/60 hover:bg-white/10 hover:text-white"
          >
            ‹
          </button>
          <p className="text-xs font-medium text-white/80">
            {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
          </p>
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="h-7 w-7 rounded-full text-sm text-white/60 hover:bg-white/10 hover:text-white"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdays.map((label) => (
            <span key={label} className="py-1 text-[10px] text-white/35">
              {label}
            </span>
          ))}
          {cells.map((day, index) => {
            if (!day) return <span key={`empty-${index}`} />
            const date = new Date(cursor.getFullYear(), cursor.getMonth(), day)
            const past = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 0, 0).getTime() < now.getTime()
            const active = selected ? sameDay(selected, date) : false
            return (
              <button
                key={day}
                type="button"
                disabled={past}
                onClick={() => apply(date, hour24, minute)}
                className={cn(
                  'h-8 rounded-full text-xs transition disabled:text-white/15',
                  active ? 'bg-white font-medium text-neutral-950' : 'text-white/75 hover:bg-white/10'
                )}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
      <div className="space-y-2 border-t border-white/10 px-3 py-3">
        <div className="grid grid-cols-2 gap-2">
          {(['오전', '오후'] as const).map((label) => {
            const active = selected ? (label === '오후') === isPm : false
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  const nextHour = label === '오후' ? (hour12 % 12) + 12 : hour12 % 12
                  apply(baseDate, nextHour, minute)
                }}
                className={cn(
                  'h-8 rounded-full text-xs font-medium transition',
                  active ? 'bg-white text-neutral-950' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <TimeWheel
            label="시간"
            values={WHEEL_HOURS}
            value={hour12}
            format={(item) => String(item)}
            tone="blue"
            disabled={(hour) => {
              const hourValue = isPm ? (hour % 12) + 12 : hour % 12
              const slot = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hourValue, minute, 0, 0)
              return slot.getTime() < now.getTime() + 60_000
            }}
            onPick={(hour) => {
              const hourValue = isPm ? (hour % 12) + 12 : hour % 12
              apply(baseDate, hourValue, minute)
            }}
          />
          <TimeWheel
            label="분"
            values={WHEEL_MINUTES}
            value={WHEEL_MINUTES.includes(minute) ? minute : 0}
            format={(item) => String(item).padStart(2, '0')}
            tone="white"
            disabled={(item) => {
              const slot = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hour24, item, 0, 0)
              return slot.getTime() < now.getTime() + 60_000
            }}
            onPick={(item) => apply(baseDate, hour24, item)}
          />
        </div>
      </div>
      <div className="flex gap-4 border-t border-white/10 px-4 py-2 text-[11px] text-white/45">
        <button type="button" className="hover:text-white" onClick={() => onChange(toLocalInput(new Date(now.getTime() + 60 * 60 * 1000)))}>
          1시간 뒤
        </button>
        <button
          type="button"
          className="hover:text-white"
          onClick={() => apply(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), 9, 0)}
        >
          내일 오전
        </button>
        <button
          type="button"
          className="hover:text-white"
          onClick={() => apply(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), 18, 0)}
        >
          내일 저녁
        </button>
      </div>
    </div>
  )
}

function shrinkImageFile(file: { name: string; mime: string; base64: string }) {
  return new Promise<File>((resolve) => {
    const image = new Image()
    image.onload = () => {
      const max = 960
      const scale = Math.min(1, max / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(fileFromBase64(file))
        return
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(fileFromBase64(file))
            return
          }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.72
      )
    }
    image.onerror = () => resolve(fileFromBase64(file))
    image.src = `data:${file.mime || 'image/jpeg'};base64,${file.base64}`
  })
}

function fileFromBase64(file: { name: string; mime: string; base64: string }) {
  const binary = atob(file.base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], file.name, { type: file.mime || 'image/jpeg' })
}

function imageCaptionBlocks(markdown: string, imagePaths: string[]) {
  const text = markdown.replace(/!\[[^\]]*\]\([^)]+\)/g, '').replace(/\*\*/g, '')
  const chunks = text.split(/\[IMAGE_(\d+)\]/i)
  const captions = imagePaths.map(() => '')
  for (let i = 1; i < chunks.length; i += 2) {
    const index = Number(chunks[i]) - 1
    const caption = String(chunks[i + 1] || '')
      .replace(/^#+\s+/gm, '')
      .replace(/\n{2,}/g, '\n')
      .trim()
    if (index >= 0 && index < captions.length) captions[index] = caption
  }
  if (!captions.some(Boolean)) {
    const parts = text
      .split(/\n{2,}/)
      .map((part) => part.replace(/^#+\s+/gm, '').replace(/\n/g, ' ').trim())
      .filter((part) => part && !part.startsWith('#'))
    parts.forEach((part, index) => {
      if (index < captions.length) captions[index] = part
    })
  }
  return imagePaths.map((imagePath, index) => ({ imagePath, text: captions[index] || '' }))
}

function accountBlogId(account: AccountRow) {
  const metaId = account.meta && typeof account.meta.blogId === 'string' ? account.meta.blogId : ''
  if (metaId) return metaId
  return account.site_url.replace(/^https?:\/\/(m\.)?blog\.naver\.com\//i, '').split('/')[0] || ''
}

function NaverLinkMark({ status }: { status?: NaverLinkStatus }) {
  if (!status || status.state === 'checking') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-white/45">
        <Loader2 className="h-3 w-3 animate-spin" /> 확인 중
      </span>
    )
  }
  if (status.state === 'linked') {
    return (
      <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
        <span className="truncate">연동됨{status.blogName ? ` · ${status.blogName}` : ''}</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-300">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
      {status.state === 'error' ? '확인 실패' : '연동 안 됨'}
    </span>
  )
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
type BlogLane = 'write' | 'shop'
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
    title: '네이버블로그 자동글쓰기',
    subtitle: '폴더 · 제목 · 카테고리',
    hint: '폴더, 제목 목록, 카테고리 공개 시간을 정한 뒤 이미지를 10장씩 올립니다.',
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
  const laneParam = searchParams.get('lane')
  const urlLane: BlogLane | null =
    laneParam === 'shop' || laneParam === 'upload' || urlMode === 'product'
      ? 'shop'
      : laneParam === 'write'
        ? 'write'
        : null
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

  useEffect(() => {
    if (laneParam !== 'shop' && laneParam !== 'upload') return
    if (urlMode === 'product') return
    setMode('product')
    setSubTab('folders')
    setHubView('write')
    router.replace('/blog?view=write&lane=shop&mode=product', { scroll: false })
  }, [laneParam, urlMode, router])

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
  const [naverLoginId, setNaverLoginId] = useState('')
  const [naverPassword, setNaverPassword] = useState('')
  const [naverBlogId, setNaverBlogId] = useState('')
  const [showNaverAccountForm, setShowNaverAccountForm] = useState(false)
  const [managingAccounts, setManagingAccounts] = useState(false)
  const [savingAccount, setSavingAccount] = useState(false)

  const [catAccountId, setCatAccountId] = useState('')
  const [catName, setCatName] = useState('')
  const [catBlogId, setCatBlogId] = useState('')
  const [openDow, setOpenDow] = useState<Weekday>(5)
  const [openTime, setOpenTime] = useState('17:00')
  const [closeDow, setCloseDow] = useState<Weekday>(0)
  const [closeTime, setCloseTime] = useState('21:00')

  const [folderTitles, setFolderTitles] = useState('')
  const [editingTitles, setEditingTitles] = useState(false)
  const [uploadAccountId, setUploadAccountId] = useState('')
  const [folderPath, setFolderPath] = useState('')
  const [folderLabel, setFolderLabel] = useState('')
  const [pickingFolder, setPickingFolder] = useState(false)
  const [chromeNote, setChromeNote] = useState('')
  const [uploadFinish, setUploadFinish] = useState<'' | 'draft' | 'schedule'>('')
  const [scheduleAt, setScheduleAt] = useState('')
  const [scheduleQueue, setScheduleQueue] = useState<string[]>([])

  const ping = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2500)
  }

  const selectLane = (next: BlogLane | null) => {
    setPreview(null)
    setSubTab('write')
    setHubView('write')
    if (next === 'shop') {
      setMode('product')
      setSubTab('folders')
      startView(() => {
        router.push('/blog?view=write&lane=shop&mode=product', { scroll: false })
      })
      return
    }
    setMode(null)
    startView(() => {
      router.push(next ? '/blog?view=write&lane=write' : '/blog?view=write', { scroll: false })
    })
  }

  const selectMode = (next: WriteMode | null) => {
    setPreview(null)
    setSubTab('write')
    setMode(next)
    setHubView('write')
    if (!next) {
      startView(() => {
        router.push(urlLane === 'shop' ? '/blog?view=write' : '/blog?view=write&lane=write', { scroll: false })
      })
      return
    }
    const lane: BlogLane = next === 'product' ? 'shop' : 'write'
    startView(() => {
      router.push(`/blog?view=write&lane=${lane}&mode=${next}`, { scroll: false })
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
    const nextFolders = (data.folders ?? []) as BlogFolderWatcherRow[]
    setFolders(nextFolders)
    const product = nextFolders.find((folder) => folder.mode === 'product')
    if (product) {
      setFolderPath((prev) => prev.trim() || product.local_path)
      setFolderTitles((prev) => {
        if (prev.trim()) return prev
        const saved = Array.isArray(product.meta?.titles) ? product.meta.titles.map((title) => String(title)).filter(Boolean) : []
        return saved.join('\n')
      })
    }
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

  const AGENT_PICKER = 'http://127.0.0.1:39217/pick-folder'

  async function pickLocalFolder() {
    setPickingFolder(true)
    setError('')
    try {
      const startPath =
        folderPath.trim() ||
        folders.find((folder) => folder.mode === 'product')?.local_path ||
        folders[0]?.local_path ||
        ''
      const res = await fetch(AGENT_PICKER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: startPath }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '폴더 선택 실패')
      if (!data.path) {
        ping('폴더 선택이 취소되었습니다')
        return
      }
      const nextPath = String(data.path)
      setFolderPath(nextPath)
      const parts = nextPath.replace(/[\\/]+$/, '').split(/[\\/]/)
      const nextLabel = folderLabel || parts[parts.length - 1] || ''
      if (!folderLabel) setFolderLabel(nextLabel)
      await rememberFolder(nextPath, folderTitles, nextLabel)
    } catch {
      setError('')
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
    const loginId = naverLoginId.trim()
    const password = naverPassword
    const blogId = naverBlogId.trim() || loginId
    if (!loginId || !password) {
      setError('네이버 아이디와 비밀번호를 입력하세요')
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
          username: loginId,
          app_password: password,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '저장 실패')
      setNaverLoginId('')
      setNaverPassword('')
      setNaverBlogId('')
      setShowNaverAccountForm(false)
      await loadAccounts()
      ping(`네이버 계정 추가됨 (총 ${accounts.filter((a) => a.provider === 'naver').length + 1}개)`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSavingAccount(false)
    }
  }

  async function loginAccount(account: AccountRow) {
    setUploadAccountId(account.id)
    setBusyKey(`login:${account.id}`)
    setError('')
    setChromeNote('로그인 창을 여는 중')
    try {
      const secretRes = await fetch('/api/blog/accounts/secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: account.id }),
      })
      const secret = await secretRes.json()
      if (!secretRes.ok) throw new Error(secret.error || '계정 정보를 읽지 못했습니다')
      const openRes = await fetch('http://127.0.0.1:39217/login-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogId: secret.blogId,
          loginId: secret.loginId,
          password: secret.password,
        }),
      })
      const openData = await openRes.json().catch(() => ({}))
      if (!openRes.ok) throw new Error(openData.error || '로그인 창을 열지 못했습니다. 폴더 프로그램을 확인해 주세요.')
      let solvedImage = ''
      let last = '로그인 창을 여는 중'
      let done = false
      for (let i = 0; i < 90; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        const statusRes = await fetch('http://127.0.0.1:39217/write-status')
        const status = await statusRes.json().catch(() => ({}))
        if (status.message) {
          last = String(status.message)
          setChromeNote(last)
        }
        if (status.phase === 'captcha' && status.image && status.image !== solvedImage) {
          solvedImage = String(status.image)
          setChromeNote('보안 확인 문제를 읽는 중')
          const answerRes = await fetch('/api/blog/login-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: status.question || '화면의 영수증을 보고 입력칸의 정답을 구하세요',
              image: status.image,
            }),
          })
          const answerData = await answerRes.json().catch(() => ({}))
          if (!answerRes.ok) throw new Error(answerData.error || '보안 확인 정답을 읽지 못했습니다')
          await fetch('http://127.0.0.1:39217/captcha-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer: answerData.answer }),
          })
        }
        if (status.phase === 'error') throw new Error(last)
        if (status.phase === 'done') {
          done = true
          break
        }
      }
      if (!done) throw new Error('로그인 창을 확인한 뒤 다시 눌러 주세요.')
      ping(last)
    } catch (e) {
      const message = e instanceof Error ? e.message : '로그인 실패'
      setError(message)
      setChromeNote(message)
    } finally {
      setBusyKey(null)
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

  async function reuploadToAccount(folderId: string, uploadId: string, accountId: string) {
    setBusyKey(`reupload:${uploadId}:${accountId}`)
    setError('')
    try {
      const res = await fetch('/api/blog/reupload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, uploadId, accountId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '재업로드 실패')
      await loadFolders()
      ping(data.message || '같은 글을 다른 계정으로 넣었습니다')
    } catch (e) {
      setError(e instanceof Error ? e.message : '재업로드 실패')
    } finally {
      setBusyKey(null)
    }
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

  const rememberFolder = useCallback(
    async (path = folderPath, titlesText = folderTitles, label = folderLabel) => {
      const localPath = path.trim()
      if (!localPath) return
      const titles = splitTitleText(titlesText)
      const folderMode: BlogMode = mode && mode !== 'seo' ? mode : 'folder'
      await fetch('/api/blog/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localPath,
          label: label || activeMeta?.title || '',
          mode: folderMode,
          titles,
          accountId: mode === 'product' ? uploadAccountId : undefined,
        }),
      }).catch(() => null)
      await loadFolders()
    },
    [folderPath, folderTitles, folderLabel, mode, uploadAccountId, activeMeta, loadFolders]
  )

  useEffect(() => {
    if (mode !== 'product' || !folderPath.trim()) return
    const handle = window.setTimeout(() => {
      void rememberFolder()
    }, 700)
    return () => window.clearTimeout(handle)
  }, [mode, folderPath, rememberFolder])

  function addScheduleSlot() {
    const when = new Date(scheduleAt)
    if (!scheduleAt || Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 60_000) {
      setError('예약 시각은 지금부터 이후로 선택하세요')
      return
    }
    if (scheduleQueue.includes(scheduleAt)) return
    if (scheduleQueue.length >= 10) {
      setError('예약은 한 번에 10편까지 넣을 수 있습니다')
      return
    }
    setError('')
    setScheduleQueue((prev) => [...prev, scheduleAt].sort((a, b) => new Date(a).getTime() - new Date(b).getTime()))
  }

  async function startChromeWrite() {
    const titles = splitTitleText(folderTitles)
    const folder = folders.find((item) => item.local_path === folderPath) || folders.find((item) => item.mode === 'product')
    if (!folderPath.trim()) {
      setError('폴더를 먼저 선택하세요')
      return
    }
    if (!titles.length) {
      setError('쓸 수 있는 제목이 없습니다')
      return
    }
    if (!uploadAccountId) {
      setError('업로드 계정을 선택하세요')
      return
    }
    if (uploadFinish !== 'draft' && uploadFinish !== 'schedule') {
      setError('일시저장 또는 예약을 선택하세요')
      return
    }
    const slots =
      uploadFinish === 'schedule'
        ? [...(scheduleQueue.length ? scheduleQueue : [scheduleAt])].sort(
            (a, b) => new Date(a).getTime() - new Date(b).getTime()
          )
        : ['']
    if (
      uploadFinish === 'schedule' &&
      slots.some((slot) => {
        const when = new Date(slot)
        return !slot || Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 60_000
      })
    ) {
      setError('예약 시각은 지금부터 이후로 선택하세요')
      return
    }
    setBusyKey('chrome')
    setError('')
    setChromeNote(slots.length > 1 ? `1/${slots.length}편 작성 중` : '크롬 창을 여는 중')
    let finishedCount = 0
    try {
      const secretRes = await fetch('/api/blog/accounts/secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: uploadAccountId }),
      })
      const secret = await secretRes.json()
      if (!secretRes.ok) throw new Error(secret.error || '계정 정보를 읽지 못했습니다')
      const usedNames = Array.isArray(folder?.meta?.usedFiles) ? folder.meta.usedFiles.map((name) => String(name)) : []
      let last = '크롬 창을 여는 중'
      for (let index = 0; index < slots.length; index += 1) {
      const slot = slots[index]
      const title = titles[Math.floor(Math.random() * titles.length)] || ''
      const step = slots.length > 1 ? `${index + 1}/${slots.length}편` : ''
      if (step) setChromeNote(`${step} 작성 중`)
      const openRes = await fetch('http://127.0.0.1:39217/open-chrome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogId: secret.blogId,
          loginId: secret.loginId,
          password: secret.password,
          title,
          fresh: index > 0,
        }),
      })
      const openData = await openRes.json().catch(() => ({}))
      if (!openRes.ok) throw new Error(openData.error || '크롬 창을 열지 못했습니다. 폴더 프로그램을 확인해 주세요.')
      const articlePromise = (async () => {
        const imageRes = await fetch('http://127.0.0.1:39217/folder-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: folderPath, skip: usedNames, limit: 10 }),
        })
        const imageData = await imageRes.json().catch(() => ({}))
        if (!imageRes.ok || !imageData.files?.length) {
          throw new Error(imageData.error || '폴더에서 이미지를 읽지 못했습니다. 폴더 프로그램을 확인해 주세요.')
        }
        const form = new FormData()
        form.set('topic', title)
        form.set('mode', 'product')
        form.set('titles', title)
        if (folder?.id) form.set('folderId', folder.id)
        for (const file of imageData.files as Array<{ name: string; mime: string; base64: string; path: string }>) {
          const image = await shrinkImageFile(file)
          form.append('images', image)
        }
        const articleRes = await fetch('/api/blog/folder-generate', { method: 'POST', body: form })
        const articleText = await articleRes.text()
        let articleData: { error?: string; article?: { title?: string; bodyMarkdown?: string; tags?: string[] }; post?: { id?: string } } = {}
        try {
          articleData = articleText ? JSON.parse(articleText) : {}
        } catch {
          throw new Error(
            articleRes.status === 403
              ? '글 생성 요청이 거절되었습니다. 사진을 줄여 다시 시도해 주세요.'
              : articleText.slice(0, 160) || '글 생성 실패'
          )
        }
        if (!articleRes.ok) throw new Error(articleData.error || '글 생성 실패')
        return { imageData, articleData }
      })()
      const articleState: {
        packed: { imageData: { files: Array<{ name: string; path: string }> }; articleData: { article?: { title?: string; bodyMarkdown?: string; tags?: string[] }; post?: { id?: string } } } | null
        error: Error | null
      } = { packed: null, error: null }
      articlePromise.then((value) => {
        articleState.packed = value
      }).catch((error) => {
        articleState.error = error instanceof Error ? error : new Error('글 생성 실패')
      })
      let writeSent = false
      let solvedImage = ''
      let lastPhase = ''
      for (let i = 0; i < 180; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        const statusRes = await fetch('http://127.0.0.1:39217/write-status')
        const status = await statusRes.json().catch(() => ({}))
        if (status.phase) lastPhase = String(status.phase)
        if (status.message) {
          last = String(status.message)
          setChromeNote(step ? `${step} · ${last}` : last)
        }
        if (status.phase === 'captcha' && status.image && status.image !== solvedImage) {
          solvedImage = String(status.image)
          setChromeNote(step ? `${step} · 보안 확인 문제를 읽는 중` : '보안 확인 문제를 읽는 중')
          const answerRes = await fetch('/api/blog/login-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: status.question || '화면의 영수증을 보고 입력칸의 정답을 구하세요',
              image: status.image,
            }),
          })
          const answerData = await answerRes.json().catch(() => ({}))
          if (!answerRes.ok) throw new Error(answerData.error || '보안 확인 정답을 읽지 못했습니다')
          await fetch('http://127.0.0.1:39217/captcha-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer: answerData.answer }),
          })
        }
        if (status.phase === 'error') throw new Error(last)
        if (articleState.packed && !writeSent && ['ready', 'login', 'chrome', 'captcha'].includes(String(status.phase))) {
          writeSent = true
          const articleData = articleState.packed.articleData
          const imageData = articleState.packed.imageData
          const writeRes = await fetch('http://127.0.0.1:39217/write-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              blogId: secret.blogId,
              loginId: secret.loginId,
              password: secret.password,
              title: articleData.article?.title || title,
              skipTitle: true,
              blocks: imageCaptionBlocks(
                String(articleData.article?.bodyMarkdown || ''),
                imageData.files.map((file) => file.path)
              ),
              hashtags: (Array.isArray(articleData.article?.tags) ? articleData.article.tags : [])
                .map((tag) => {
                  const clean = String(tag).replace(/^#+/, '').trim()
                  return clean ? `#${clean}` : ''
                })
                .filter(Boolean)
                .join(' '),
              finish: uploadFinish,
              scheduleAt: uploadFinish === 'schedule' ? slot : '',
            }),
          })
          const writeData = await writeRes.json().catch(() => ({}))
          if (!writeRes.ok) throw new Error(writeData.error || '크롬 글쓰기를 시작하지 못했습니다')
        }
        if (status.phase === 'done' && writeSent) break
        if (articleState.error && !['captcha', 'login', 'chrome'].includes(String(status.phase || ''))) throw articleState.error
      }
      if (articleState.error && !articleState.packed) throw articleState.error
      if (!articleState.packed) articleState.packed = await articlePromise
      if (!writeSent || lastPhase !== 'done') {
        throw new Error('이 편을 끝까지 쓰지 못했습니다. 남은 예약은 목록에 남아 있습니다.')
      }
      const articleData = articleState.packed.articleData
      const imageData = articleState.packed.imageData
      const writtenFiles = (imageData.files as Array<{ name: string }>).map((file) => file.name)
      if (folder?.id) {
        await fetch('/api/blog/folders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: folder.id,
            usedTitle: articleData.article?.title || title,
            usedFiles: writtenFiles,
            excerpt: String(articleData.article?.bodyMarkdown || '').replace(/!\[[^\]]*\]\([^)]+\)/g, '').slice(0, 240),
            postId: articleData.post?.id || null,
          }),
        })
      }
      usedNames.push(...writtenFiles)
      finishedCount += 1
      if (uploadFinish === 'schedule') setScheduleQueue((prev) => prev.filter((item) => item !== slot))
      }
      if (uploadFinish === 'schedule' && slots.length > 1) {
        last = `${slots.length}편 예약했습니다. 창은 닫지 않습니다.`
        setChromeNote(last)
      }
      await loadFolders()
      ping(last)
    } catch (e) {
      const message = e instanceof Error ? e.message : '크롬 글쓰기 실패'
      const prefix = finishedCount > 0 ? `${finishedCount}편은 예약됐습니다. ` : ''
      setError(prefix + message)
      setChromeNote(prefix + message)
    } finally {
      setBusyKey(null)
    }
  }

  const dowOptions = WEEKDAY_LABELS.map((label, value) => ({ label, value: value as Weekday }))
  const naverAccounts = accounts.filter((a) => a.provider === 'naver')
  const [linkStatus, setLinkStatus] = useState<Record<string, NaverLinkStatus>>({})

  const verifyAccount = useCallback(async (account: AccountRow) => {
    const blogId = accountBlogId(account)
    setLinkStatus((prev) => ({ ...prev, [account.id]: { state: 'checking' } }))
    try {
      const res = await fetch('/api/blog/accounts/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId }),
      })
      const data = (await res.json().catch(() => ({}))) as { linked?: boolean; blogName?: string }
      if (res.ok && data.linked) {
        setLinkStatus((prev) => ({
          ...prev,
          [account.id]: { state: 'linked', blogName: String(data.blogName || '') },
        }))
        return
      }
      setLinkStatus((prev) => ({
        ...prev,
        [account.id]: { state: res.ok ? 'missing' : 'error' },
      }))
    } catch {
      setLinkStatus((prev) => ({ ...prev, [account.id]: { state: 'error' } }))
    }
  }, [])

  const naverIds = naverAccounts.map((account) => account.id).join('|')
  useEffect(() => {
    const list = accounts.filter((account) => account.provider === 'naver')
    for (const account of list) void verifyAccount(account)
  }, [naverIds, accounts, verifyAccount])

  useEffect(() => {
    const list = accounts.filter((account) => account.provider === 'naver')
    if (list.length === 0) {
      if (uploadAccountId) setUploadAccountId('')
      return
    }
    if (!list.some((account) => account.id === uploadAccountId)) {
      setUploadAccountId(list[0].id)
    }
  }, [accounts, uploadAccountId])

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
              {!urlLane ? (
                <div>
                  <h1 className="text-xl font-bold text-white">블로그</h1>
                  <p className="mt-1 text-sm text-white/45">원하는 작업을 고르세요.</p>
                </div>
              ) : null}

              {urlLane === 'write' ? (
              <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white">네이버 블로그 계정</h2>
                    <p className="mt-1 text-xs text-white/45">네이버 아이디와 비밀번호로 등록합니다.</p>
                  </div>
                  <div
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-semibold',
                      naverAccounts.length > 0 &&
                        naverAccounts.every((account) => linkStatus[account.id]?.state === 'linked')
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : naverAccounts.some((account) => linkStatus[account.id]?.state === 'linked')
                          ? 'bg-amber-500/15 text-amber-200'
                          : 'bg-white/8 text-white/45'
                    )}
                  >
                    {naverAccounts.length === 0
                      ? '연결 안 됨'
                      : `${naverAccounts.filter((account) => linkStatus[account.id]?.state === 'linked').length}/${naverAccounts.length} 연동됨`}
                  </div>
                </div>
                <div className="mb-4 grid gap-2 sm:grid-cols-2">
                  <input
                    value={naverLoginId}
                    onChange={(e) => setNaverLoginId(e.target.value)}
                    placeholder="네이버 아이디"
                    name="mostem-naver-login-id"
                    autoComplete="off"
                    readOnly
                    onFocus={(e) => {
                      e.currentTarget.readOnly = false
                    }}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
                  />
                  <input
                    value={naverPassword}
                    onChange={(e) => setNaverPassword(e.target.value)}
                    placeholder="비밀번호"
                    type="password"
                    name="mostem-naver-login-secret"
                    autoComplete="new-password"
                    readOnly
                    onFocus={(e) => {
                      e.currentTarget.readOnly = false
                    }}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
                  />
                  <input
                    value={naverBlogId}
                    onChange={(e) => setNaverBlogId(e.target.value)}
                    placeholder="블로그 아이디 (로그인 아이디와 같으면 비움)"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={savingAccount}
                    onClick={() => void saveNaverAccount()}
                    className="rounded-xl bg-gold/20 px-4 py-2.5 text-sm font-semibold text-gold hover:bg-gold/30 disabled:opacity-50"
                  >
                    {savingAccount ? '등록 중…' : '계정 등록'}
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
                          <p className="truncate text-sm font-semibold text-white">{a.username}</p>
                          <p className="mt-0.5 truncate text-[11px] text-white/40">{a.site_url}</p>
                          <div className="mt-1.5">
                            <NaverLinkMark status={linkStatus[a.id]} />
                          </div>
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
              ) : null}

              <div>
                {urlLane === 'write' ? (
                  <h2 className="mb-3 text-sm font-semibold text-white/70">네이버블로그 일반글 / 홈판글</h2>
                ) : null}
                {!urlLane ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => selectLane('shop')}
                      className="flex min-h-[180px] flex-col rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/20 to-orange-600/10 p-5 text-left transition hover:scale-[1.01]"
                    >
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                        <ShoppingBag className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-white">네이버블로그 자동글쓰기</h3>
                      <p className="mt-1 text-xs font-semibold text-white/55">폴더 · 상품</p>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-white/65">
                        폴더 이미지를 올리고, 제목 목록과 카테고리 예약으로 글을 만듭니다.
                      </p>
                      <p className="mt-4 text-[11px] text-white/40">선택하면 상세 작업 →</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectLane('write')}
                      className="flex min-h-[180px] flex-col rounded-3xl border border-sky-400/30 bg-gradient-to-br from-sky-500/20 to-blue-600/10 p-5 text-left transition hover:scale-[1.01]"
                    >
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                        <PenLine className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-white">네이버블로그 일반글 / 홈판글</h3>
                      <p className="mt-1 text-xs font-semibold text-white/55">일반글 · 홈판글</p>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-white/65">
                        일반 검색글과 홈판 추천글을 고른 뒤 상세 작업을 진행합니다.
                      </p>
                      <p className="mt-4 text-[11px] text-white/40">선택하면 상세 작업 →</p>
                    </button>
                  </div>
                ) : urlLane === 'write' ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => selectLane(null)}
                      className="inline-flex items-center gap-1 text-xs text-white/45 hover:text-white"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> 처음으로
                    </button>
                    <div className="grid gap-4 md:grid-cols-2">
                      {MODES.filter((item) => item.id !== 'product').map((item) => {
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
                ) : null}
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
    <div className={cn('space-y-6', mode === 'product' && 'mx-auto w-full max-w-[680px]')}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => selectMode(null)}
            className="mb-2 inline-flex items-center gap-1 text-xs text-white/45 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 글 발행 홈
          </button>
          {mode === 'product' ? (
            <>
              <p className="text-[11px] font-medium tracking-[0.2em] text-white/35">NAVER BLOG</p>
              <h1 className="mt-2 text-[1.7rem] font-semibold tracking-tight text-white">자동 글쓰기</h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/45">
                폴더와 제목을 정해 두면, 사진과 멘트를 이어서 올립니다.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white">{activeMeta?.title}</h1>
              <p className="mt-1 text-sm text-white/45">{activeMeta?.hint}</p>
            </>
          )}
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

      {mode !== 'product' ? (
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['write', '키워드로 쓰기'] as const,
            ['drafts', '초안'] as const,
            ['folders', '폴더 이미지'] as const,
            ['ops', '운영'] as const,
          ]
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
      ) : null}

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

      {mode === 'product' ? (
        <section className="space-y-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setManagingAccounts((open) => !open)}
                className={cn(
                  'text-sm font-medium transition',
                  managingAccounts ? 'text-white' : 'text-white/80 hover:text-white'
                )}
              >
                계정관리
              </button>
              {naverAccounts.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    for (const account of naverAccounts) void verifyAccount(account)
                  }}
                  className="text-[11px] text-white/40 transition hover:text-white/70"
                >
                  연동 {naverAccounts.filter((account) => linkStatus[account.id]?.state === 'linked').length}/
                  {naverAccounts.length}
                </button>
              ) : null}
            </div>
            {showNaverAccountForm ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={naverLoginId}
                  onChange={(e) => setNaverLoginId(e.target.value)}
                  placeholder="네이버 아이디"
                  name="mostem-naver-login-id"
                  autoComplete="off"
                  readOnly
                  onFocus={(e) => {
                    e.currentTarget.readOnly = false
                  }}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-white/25"
                />
                <input
                  value={naverPassword}
                  onChange={(e) => setNaverPassword(e.target.value)}
                  placeholder="비밀번호"
                  type="text"
                  name="mostem-naver-login-secret"
                  autoComplete="off"
                  readOnly
                  onFocus={(e) => {
                    e.currentTarget.readOnly = false
                  }}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-white/25"
                />
                <input
                  value={naverBlogId}
                  onChange={(e) => setNaverBlogId(e.target.value)}
                  placeholder="블로그 아이디, 로그인 아이디와 같으면 비움"
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-white/25 sm:col-span-2"
                />
                <button
                  type="button"
                  disabled={savingAccount}
                  onClick={() => void saveNaverAccount()}
                  className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50"
                >
                  {savingAccount ? '등록 중' : '계정 등록'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNaverAccountForm(false)
                    setNaverLoginId('')
                    setNaverPassword('')
                    setNaverBlogId('')
                  }}
                  className="rounded-full px-4 py-3 text-sm text-white/55 transition hover:text-white"
                >
                  닫기
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {naverAccounts.map((account) => {
                  const selected = account.id === uploadAccountId
                  const linked = linkStatus[account.id]?.state === 'linked'
                  return (
                    <div key={account.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUploadAccountId(account.id)}
                        className={cn(
                          'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition',
                          selected ? 'border-white/30 bg-white text-neutral-950' : 'border-white/10 bg-white/[0.03] text-white/70'
                        )}
                      >
                        {account.username || accountBlogId(account)}
                        <span className={cn('h-1.5 w-1.5 rounded-full', linked ? 'bg-emerald-400' : 'bg-white/25')} />
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(busyKey)}
                        onClick={() => void loginAccount(account)}
                        className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-40"
                      >
                        {busyKey === `login:${account.id}` ? '로그인 중' : '로그인하기'}
                      </button>
                    </div>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setShowNaverAccountForm(true)}
                  className="rounded-full border border-dashed border-white/15 px-3 py-1.5 text-sm text-white/50 transition hover:border-white/30 hover:text-white"
                >
                  계정 추가
                </button>
              </div>
            )}
            {managingAccounts && !showNaverAccountForm ? (
              <ul className="space-y-2">
                {naverAccounts.length === 0 ? (
                  <li className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/40">
                    등록된 계정이 없습니다.
                  </li>
                ) : (
                  naverAccounts.map((account) => (
                    <li
                      key={account.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <span className="truncate text-sm text-white">{account.username || accountBlogId(account)}</span>
                      <button
                        type="button"
                        onClick={() => void removeAccount(account.id)}
                        className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition hover:border-rose-300/50 hover:text-rose-200"
                      >
                        삭제
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-medium text-white/80">폴더</h2>
              <p className="mt-1 break-all text-[11px] leading-relaxed text-white/45">
                {folderPath.trim() || '아직 선택하지 않았습니다'}
              </p>
            </div>
            <button
              type="button"
              disabled={pickingFolder}
              onClick={() => void pickLocalFolder()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm text-white/80 transition hover:border-white/25 hover:bg-white/[0.04] disabled:opacity-50"
            >
              {pickingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
              폴더 찾아보기
            </button>
          </div>

          <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-white/80">제목</h2>
              <p className="mt-1 text-[11px] text-white/35">
                {splitTitleText(folderTitles).length
                  ? `${splitTitleText(folderTitles).length}개 · 쓸 때마다 하나`
                  : '아직 없음'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingTitles((open) => !open)}
              className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:border-white/25 hover:text-white"
            >
              {editingTitles ? '닫기' : '수정'}
            </button>
          </div>
          {editingTitles ? (
            <textarea
              wrap="off"
              value={titleFieldValue(folderTitles)}
              onChange={(e) => setFolderTitles(e.target.value)}
              placeholder={'제목은 한 줄에 하나'}
              rows={Math.min(8, Math.max(4, splitTitleText(folderTitles).length || 4))}
              className="w-full resize-none overflow-auto rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-8 outline-none transition placeholder:text-white/25 focus:border-white/25"
              style={{ whiteSpace: 'pre', overflowWrap: 'normal', wordBreak: 'keep-all' }}
            />
          ) : null}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-white/80">마무리</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUploadFinish('draft')}
                className={cn(
                  'rounded-full border px-4 py-3 text-sm font-medium transition',
                  uploadFinish === 'draft'
                    ? 'border-white bg-white text-neutral-950'
                    : 'border-white/10 text-white/70 hover:border-white/25'
                )}
              >
                일시저장
              </button>
              <button
                type="button"
                onClick={() => setUploadFinish('schedule')}
                className={cn(
                  'rounded-full border px-4 py-3 text-sm font-medium transition',
                  uploadFinish === 'schedule'
                    ? 'border-white bg-white text-neutral-950'
                    : 'border-white/10 text-white/70 hover:border-white/25'
                )}
              >
                예약
              </button>
            </div>
            {uploadFinish === 'schedule' ? (
              <>
                <ScheduleQuickPick value={scheduleAt} onChange={setScheduleAt} />
                <button
                  type="button"
                  onClick={addScheduleSlot}
                  disabled={!scheduleAt || scheduleQueue.includes(scheduleAt) || scheduleQueue.length >= 10}
                  className="w-full rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/80 transition hover:border-white/30 hover:text-white disabled:opacity-40"
                >
                  이 시각 추가
                </button>
                {scheduleQueue.length > 0 ? (
                  <ul className="space-y-1">
                    {scheduleQueue.map((item, index) => (
                      <li
                        key={item}
                        className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-white"
                      >
                        <span>
                          {index + 1}. {formatSchedule(item)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setScheduleQueue((prev) => prev.filter((value) => value !== item))}
                          className="text-xs text-white/45 transition hover:text-white"
                        >
                          빼기
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-[11px] text-white/35">
                    시각을 여러 개 추가하면, 시작 한 번으로 그 순서대로 이어서 예약합니다.
                  </p>
                )}
              </>
            ) : null}
            <button
              type="button"
              disabled={
                Boolean(busyKey) ||
                !folderPath.trim() ||
                (uploadFinish !== 'draft' && uploadFinish !== 'schedule') ||
                (uploadFinish === 'schedule' && scheduleQueue.length === 0 && !scheduleAt)
              }
              onClick={() => void startChromeWrite()}
              className="mostem-upload-btn group relative flex w-full items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(110deg,#fff8e8_0%,#f6d98a_38%,#fffdf6_50%,#f0c85a_100%)] px-6 py-4 text-[15px] font-semibold tracking-tight text-neutral-950 transition duration-300 hover:scale-[1.015] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              <span className="mostem-upload-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/80 to-transparent" />
              <span className="relative">
                {busyKey === 'chrome'
                  ? '업로드 중'
                  : uploadFinish === 'schedule' && scheduleQueue.length > 1
                    ? `자동업로드 시작 · ${scheduleQueue.length}편`
                    : '자동업로드 시작'}
              </span>
            </button>
            {chromeNote ? <p className="text-center text-xs text-white/45">{chromeNote}</p> : null}
          </div>
        </section>
      ) : null}

      {subTab === 'folders' && mode !== 'product' ? (
        <div className="grid gap-4">
          <div className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <FolderOpen className="h-4 w-4" /> 로컬 폴더 이미지 → AI 글
              </div>
            </div>
            <p className="text-xs text-white/40">
              「폴더 찾아보기」로 PC에서 직접 선택합니다. (브라우저 보안상 경로 타이핑 대신 로컬 에이전트 창을 사용합니다)
            </p>
            <button
              type="button"
              disabled={pickingFolder}
              onClick={() => void pickLocalFolder()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
            >
              {pickingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
              폴더 찾아보기
            </button>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-white/35">선택된 경로</p>
              <p className="mt-1 break-all text-sm text-white/85">{folderPath || '아직 선택하지 않았습니다'}</p>
            </div>
          </div>
        </div>
      ) : null}

      {subTab === 'ops' || mode === 'product' ? (
        <div className={mode === 'product' ? 'grid gap-4' : 'grid gap-4 lg:grid-cols-2'}>
          <div className={mode === 'product' ? 'space-y-4 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 sm:p-8' : 'space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4'}>
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <CalendarClock className="h-4 w-4" /> {mode === 'product' ? '카테고리 공개' : '네이버 카테고리 On/Off'}
            </div>
            <p className="text-xs leading-relaxed text-white/40">
              예: 금 17:00 공개, 일 21:00 비공개. 그 시간에 이 PC가 켜져 있어야 합니다.
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
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">네이버 계정 선택</option>
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
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none"
                  style={{ colorScheme: 'dark' }}
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
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none"
                  style={{ colorScheme: 'dark' }}
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
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/[0.04] disabled:opacity-50"
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

          {mode === 'product' ? null : (
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
              <p className="mb-2 text-[11px] text-white/40">아이디와 비밀번호로 등록합니다.</p>
              <input
                value={naverLoginId}
                onChange={(e) => setNaverLoginId(e.target.value)}
                placeholder="네이버 아이디"
                name="mostem-naver-login-id"
                autoComplete="off"
                readOnly
                onFocus={(e) => {
                  e.currentTarget.readOnly = false
                }}
                className="mb-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                value={naverPassword}
                onChange={(e) => setNaverPassword(e.target.value)}
                placeholder="비밀번호"
                type="password"
                name="mostem-naver-login-secret"
                autoComplete="new-password"
                readOnly
                onFocus={(e) => {
                  e.currentTarget.readOnly = false
                }}
                className="mb-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                value={naverBlogId}
                onChange={(e) => setNaverBlogId(e.target.value)}
                placeholder="블로그 아이디 (로그인 아이디와 같으면 비움)"
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
                        <span className="min-w-0">
                          <span className="block truncate">
                            <span className="font-semibold text-white">{a.username}</span>
                            <span className="text-white/35"> · {a.site_url}</span>
                          </span>
                          <span className="mt-1 block">
                            <NaverLinkMark status={linkStatus[a.id]} />
                          </span>
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
          )}
        </div>
      ) : null}

      {mode === 'product' ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">업로드 기록</h2>
          {modeFolders.flatMap((folder) => {
            const uploads = Array.isArray(folder.meta?.uploads) ? folder.meta.uploads : []
            return uploads.map((item) => ({ folder, item: item as Record<string, unknown> }))
          }).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-white/40">
              아직 올린 글이 없습니다.
            </div>
          ) : (
            modeFolders.flatMap((folder) => {
              const uploads = Array.isArray(folder.meta?.uploads) ? folder.meta.uploads : []
              return uploads.map((raw) => {
                const item = raw as Record<string, unknown>
                const uploadId = String(item.id || '')
                const files = Array.isArray(item.files) ? item.files.map((name) => String(name)) : []
                const sent = Array.isArray(item.accounts) ? item.accounts : []
                const sentIds = new Set(
                  sent.map((account) => String((account as Record<string, unknown>).accountId || ''))
                )
                return (
                  <article
                    key={`${folder.id}:${uploadId}`}
                    className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-white">{String(item.title || '제목 없음')}</h3>
                      <p className="text-[11px] text-white/35">
                        {item.at ? new Date(String(item.at)).toLocaleString('ko-KR') : ''}
                      </p>
                    </div>
                    {item.excerpt ? (
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/55">{String(item.excerpt)}</p>
                    ) : null}
                    <p className="mt-2 text-[11px] text-white/40">이미지 {files.length}장 · {files.join(', ') || '기록 없음'}</p>
                    <p className="mt-1 text-[11px] text-white/40">
                      올린 계정:{' '}
                      {sent.length
                        ? sent.map((account) => String((account as Record<string, unknown>).name || '')).join(', ')
                        : '아직 없음'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {naverAccounts.length === 0 ? (
                        <p className="text-[11px] text-white/35">네이버 계정을 추가하면 그 계정으로 다시 올릴 수 있습니다.</p>
                      ) : (
                        naverAccounts.map((account) => {
                          const done = sentIds.has(account.id)
                          return (
                            <button
                              key={account.id}
                              type="button"
                              disabled={done || Boolean(busyKey)}
                              onClick={() => void reuploadToAccount(folder.id, uploadId, account.id)}
                              className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
                            >
                              {done ? `${account.username}에 올림` : `${account.username}으로 재업로드`}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </article>
                )
              })
            })
          )}
        </section>
      ) : null}
    </div>
  )
}
