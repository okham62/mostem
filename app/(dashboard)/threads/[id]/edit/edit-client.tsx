'use client'

import { Paperclip, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { GRADE_LABEL, formatCount, mediaSrc } from '@/lib/collect-labels'
import { cleanMediaUrl, imagePosterUrl, isVideoFile, parseMediaItems } from '@/lib/collect-media'
import { DEFAULT_AI_GUIDES, pickDefaultGuide, type AiGuide } from '@/lib/ai-guides'
import type { CollectedPost, ConnectedAccount } from '@/types'
import { DEFAULT_AI_MODEL } from '@/lib/ai-models'
import { MAX_THREAD_REPLIES, readEditDraft, writeEditDraft, type GenerateRun } from '@/lib/edit-drafts'
import { publicThreadsAvatar, requestHamiThreadsProfiles } from '@/lib/threads-profile'
import {
  clearStoredSchedule,
  formatScheduleNotice,
  parseScheduleDate,
  readStoredSchedule,
  writeStoredSchedule,
} from '@/lib/post-schedule'
import { GenerateHistoryModal } from './generate-history-modal'
import {
  hamiSupportsMediaPublish,
  hamiSupportsNativeSchedule,
  isHamiOnline,
  publishMediaUrl,
  requestHamiPublish,
  requestHamiSchedule,
} from '@/lib/threads-publish'
import { EditToolbar } from './edit-toolbar'
import { ModelPicker } from './model-picker'
import { PublishModal } from './publish-modal'
import { ScheduleModal } from './schedule-modal'
import { TemplateModal } from './template-modal'
import { cn } from '@/lib/utils'

type Tab = 'original' | 'rewrite'
type MediaPreview = { url: string; type: 'image' | 'video'; poster?: string }
type CommentAttachment = { name: string; base64: string }
type ThreadReply = { id: string; text: string }

const MAX_COMMENT_FILE_BYTES = 5 * 1024 * 1024
const THREAD_CHAR_LIMIT = 500
/** Default caption box height — matches the edit UI frame the user marked. */
const CAPTION_MIN_PX = 260
const REPLY_MIN_PX = 96

function syncTextareaHeight(el: HTMLTextAreaElement, minHeight: number) {
  el.style.height = '0px'
  el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`
}

function AutoGrowTextarea({
  value,
  onChange,
  minHeight = CAPTION_MIN_PX,
  className,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  minHeight?: number
  className?: string
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    syncTextareaHeight(el, minHeight)
  }, [value, minHeight])

  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      rows={1}
      onChange={(event) => {
        onChange(event.target.value)
        syncTextareaHeight(event.target, minHeight)
      }}
      onInput={(event) => syncTextareaHeight(event.currentTarget, minHeight)}
      className={cn(
        'box-border block w-full max-w-full min-w-0 resize-none overflow-x-hidden overflow-y-hidden break-words rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-brand',
        className
      )}
      style={{ minHeight, height: minHeight }}
    />
  )
}

function PreviewAccountAvatar({ account }: { account?: ConnectedAccount | null }) {
  const avatar =
    mediaSrc(account?.avatar_url) ||
    mediaSrc(publicThreadsAvatar(account?.username || '') || '') ||
    ''
  const letter = (account?.username?.[0] ?? '나').toUpperCase()

  if (avatar) {
    return (
      <img
        src={avatar}
        alt=""
        className="h-9 w-9 rounded-full object-cover bg-black/40"
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand text-[11px] font-bold text-white">
      {letter}
    </div>
  )
}

function newReplyId() {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const base64 = result.includes(',') ? result.slice(result.indexOf(',') + 1) : result
      if (!base64) reject(new Error('파일을 읽지 못했습니다.'))
      else resolve(base64)
    }
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
    reader.readAsDataURL(file)
  })
}

function displaySrc(url?: string | null) {
  if (!url) return ''
  if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/')) return url
  return mediaSrc(url) || url
}

function originalMedia(post: CollectedPost): MediaPreview[] {
  const items: MediaPreview[] = []
  const seen = new Set<string>()
  for (const item of parseMediaItems(post)) {
    const video =
      cleanMediaUrl(item.videoUrl) ??
      (item.type === 'video' && isVideoFile(item.url) ? cleanMediaUrl(item.url) : null)
    const image = imagePosterUrl(item.poster, video ? null : item.url)
    const key = video || cleanMediaUrl(item.url) || image
    if (!key || seen.has(key)) continue
    seen.add(key)
    items.push({
      url: video || image || key,
      poster: image ?? undefined,
      type: video ? 'video' : 'image',
    })
  }
  if (!items.length) {
    const thumb = imagePosterUrl(post.thumbnail_url)
    if (thumb) items.push({ url: thumb, poster: thumb, type: 'image' })
  }
  return items
}

function MediaThumb({ item }: { item: MediaPreview }) {
  if (item.type === 'video') {
    const src = displaySrc(item.url)
    const poster = displaySrc(item.poster)
    if (!src && !poster) return <div className="h-full w-full bg-white/10" />
    return (
      <>
        <video
          src={src || undefined}
          poster={poster || undefined}
          muted
          playsInline
          preload="auto"
          className="h-full w-full object-cover"
        />
        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] text-white">▶</span>
      </>
    )
  }
  const src = displaySrc(item.poster || item.url)
  if (!src) return <div className="h-full w-full bg-white/10" />
  return <img src={src} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
}

function MediaHoverTile({
  item,
  active,
  onPreview,
  onPreviewEnd,
  onRemove,
  removeLabel,
}: {
  item: MediaPreview
  active?: boolean
  onPreview: (item: MediaPreview) => void
  onPreviewEnd: () => void
  onRemove: () => void
  removeLabel: string
}) {
  return (
    <div
      className="relative h-24 w-24 shrink-0"
      onMouseEnter={() => onPreview(item)}
      onMouseLeave={onPreviewEnd}
    >
      <div
        className={`relative h-24 w-24 overflow-hidden rounded-lg bg-white/5 ${
          active ? 'ring-2 ring-brand ring-offset-2 ring-offset-[#141418]' : ''
        }`}
      >
        <MediaThumb item={item} />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onPreviewEnd()
            onRemove()
          }}
          className="absolute right-0.5 top-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-[11px] text-white hover:bg-red-500"
          aria-label={removeLabel}
        >
          ×
        </button>
      </div>
    </div>
  )
}

function HoverPreview({
  item,
  anchor,
}: {
  item: MediaPreview | null
  anchor: HTMLElement | null
}) {
  if (!item) return null

  const src = displaySrc(item.url)
  const poster = displaySrc(item.poster)
  const box = anchor?.getBoundingClientRect()
  const top = box ? box.bottom + 10 : 160

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[70] -translate-x-1/2"
      style={{ top }}
    >
      {item.type === 'video' ? (
        <video
          key={item.url}
          src={src}
          poster={poster || undefined}
          autoPlay
          muted
          playsInline
          loop
          preload="auto"
          ref={(el) => {
            if (!el) return
            el.muted = true
            el.currentTime = 0
            const play = el.play()
            if (play) void play.catch(() => {})
          }}
          className="max-h-[62vh] max-w-[min(520px,72vw)] rounded-2xl object-contain shadow-2xl"
        />
      ) : (
        <img
          key={item.url}
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className="max-h-[62vh] max-w-[min(520px,72vw)] rounded-2xl object-contain shadow-2xl"
        />
      )}
    </div>
  )
}

export function EditClient({
  post,
  accounts,
  initialTab,
  openPublish = false,
  isAdmin = false,
}: {
  post: CollectedPost
  accounts: ConnectedAccount[]
  initialTab?: Tab
  openPublish?: boolean
  isAdmin?: boolean
}) {
  const router = useRouter()
  const sourceMedia = useMemo(() => originalMedia(post), [post])
  const [tab, setTab] = useState<Tab>(initialTab === 'rewrite' ? 'rewrite' : 'original')
  const [caption, setCaption] = useState(post.caption ?? '')
  const [drafts, setDrafts] = useState<string[]>([post.caption ?? '', '', ''])
  const [draftIndex, setDraftIndex] = useState(0)
  const [sourceCaption, setSourceCaption] = useState(
    post.caption && post.caption !== post.author ? post.caption : ''
  )
  const [instruction, setInstruction] = useState('')
  const [commentFile, setCommentFile] = useState<CommentAttachment | null>(null)
  const [commentDropActive, setCommentDropActive] = useState(false)
  const [replies, setReplies] = useState<ThreadReply[]>([])
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [liveAccounts, setLiveAccounts] = useState(accounts)
  const profileRefreshRef = useRef(false)
  const [guides, setGuides] = useState<AiGuide[]>(DEFAULT_AI_GUIDES)
  const [guideId, setGuideId] = useState(pickDefaultGuide(DEFAULT_AI_GUIDES).id)
  const [extraMedia, setExtraMedia] = useState<MediaPreview[]>([])
  const [hiddenSource, setHiddenSource] = useState<string[]>([])
  const [lightbox, setLightbox] = useState<MediaPreview | null>(null)
  const mediaStripRef = useRef<HTMLDivElement>(null)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [modelId, setModelId] = useState(DEFAULT_AI_MODEL?.id ?? 'gemini-3.8-flash')
  const [webSearch, setWebSearch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showOriginalModal, setShowOriginalModal] = useState(false)
  const [publishOpen, setPublishOpen] = useState(openPublish)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleFeedback, setScheduleFeedback] = useState('')
  const [scheduleAt, setScheduleAt] = useState(() => {
    const saved = parseScheduleDate(post.scheduled_at)
    return saved ?? new Date(Date.now() + 10 * 60 * 1000)
  })
  const [resolvedSchedule, setResolvedSchedule] = useState<Date | null>(() =>
    parseScheduleDate(post.scheduled_at)
  )
  const [postStatus, setPostStatus] = useState(post.status)
  const [history, setHistory] = useState<GenerateRun[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

  function pickSchedule(mins: number) {
    setScheduleAt(new Date(Date.now() + mins * 60 * 1000))
  }

  const thumb = mediaSrc(post.thumbnail_url)
  const selected = liveAccounts.find((a) => a.id === accountId) ?? liveAccounts[0]
  const grade = post.grade ? GRADE_LABEL[post.grade] : null
  const date = post.collected_at ? new Date(post.collected_at).toISOString().slice(0, 10) : ''
  const originalCaption = sourceCaption || '본문 없음'

  useEffect(() => {
    setLiveAccounts(accounts)
    profileRefreshRef.current = false
  }, [accounts])

  useEffect(() => {
    if (accounts.length && !accounts.some((item) => item.id === accountId)) {
      setAccountId(accounts[0]?.id ?? '')
    }
  }, [accounts, accountId])

  useEffect(() => {
    if (!liveAccounts.length || profileRefreshRef.current) return
    profileRefreshRef.current = true
    let cancelled = false
    void (async () => {
      const result = await requestHamiThreadsProfiles(liveAccounts.map((a) => a.username))
      if (cancelled || !result.profiles.length) return

      setLiveAccounts((prev) =>
        prev.map((account) => {
          const live = result.profiles.find(
            (row) => row.username.toLowerCase() === account.username.toLowerCase()
          )
          if (!live) {
            return {
              ...account,
              avatar_url: account.avatar_url || publicThreadsAvatar(account.username),
            }
          }
          return {
            ...account,
            avatar_url: live.avatarUrl || account.avatar_url || publicThreadsAvatar(account.username),
            display_name: live.displayName || account.display_name,
          }
        })
      )

      void fetch('/api/accounts/threads/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profiles: result.profiles.map((row) => ({
            username: row.username,
            displayName: row.displayName,
            avatarUrl: row.avatarUrl,
          })),
        }),
      }).catch(() => null)
    })()
    return () => {
      cancelled = true
    }
  }, [liveAccounts])

  const statusLockRef = useRef(post.status === 'uploaded' || post.status === 'scheduled')
  const captionRef = useRef(caption)
  const draftsRef = useRef(drafts)
  const draftIndexRef = useRef(draftIndex)
  const hiddenSourceRef = useRef(hiddenSource)
  const sourceCaptionRef = useRef(sourceCaption)
  const historyRef = useRef(history)
  const accountRef = useRef(selected?.username)
  const repliesRef = useRef(replies)
  captionRef.current = caption
  draftsRef.current = drafts
  draftIndexRef.current = draftIndex
  hiddenSourceRef.current = hiddenSource
  sourceCaptionRef.current = sourceCaption
  historyRef.current = history
  accountRef.current = selected?.username
  repliesRef.current = replies

  function rememberDraft() {
    writeEditDraft(post.id, {
      original: sourceCaptionRef.current || post.caption || '',
      drafts: [
        draftsRef.current[0] ?? '',
        draftsRef.current[1] ?? '',
        draftsRef.current[2] ?? '',
      ],
      draftIndex: draftIndexRef.current,
      hiddenSource: hiddenSourceRef.current,
      history: historyRef.current,
      replies: repliesRef.current.map((item) => item.text),
    })
  }

  async function flushEditSave(keepalive = false) {
    rememberDraft()
    const body: Record<string, string> = {
      caption: captionRef.current,
    }
    if (accountRef.current) body.collected_by = accountRef.current
    if (!statusLockRef.current) body.status = 'editing'
    try {
      await fetch(`/api/threads/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive,
      })
    } catch {
      /* leave still goes back */
    }
  }

  useEffect(() => {
    const stored = readEditDraft(post.id)
    if (stored?.original) setSourceCaption(stored.original)
    else if (post.caption && post.caption !== post.author) {
      writeEditDraft(post.id, {
        original: post.caption,
        drafts: [post.caption, '', ''],
        draftIndex: 0,
        hiddenSource: [],
      })
    }
    if (!stored) return
    setDrafts(stored.drafts)
    setDraftIndex(stored.draftIndex)
    setCaption(stored.drafts[stored.draftIndex] || stored.drafts[0] || post.caption || '')
    setHiddenSource(stored.hiddenSource)
    setHistory(stored.history)
    setReplies(
      (stored.replies ?? []).map((text) => ({
        id: newReplyId(),
        text,
      }))
    )
  }, [post.id])

  useEffect(() => {
    setPostStatus(post.status)
    const fromPost = parseScheduleDate(post.scheduled_at)
    if (fromPost) {
      setScheduleAt(fromPost)
      setResolvedSchedule(fromPost)
      writeStoredSchedule(post.id, fromPost.toISOString())
      return
    }
    if (post.status !== 'scheduled') {
      setResolvedSchedule(null)
      return
    }
    const fromStore = parseScheduleDate(readStoredSchedule(post.id))
    if (fromStore) {
      setScheduleAt(fromStore)
      setResolvedSchedule(fromStore)
      // Backfill DB when column was missing at schedule time.
      void fetch(`/api/threads/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'scheduled',
          scheduled_at: fromStore.toISOString(),
        }),
      })
    }
  }, [post.id, post.scheduled_at, post.status])

  useEffect(() => {
    const onHide = () => {
      void flushEditSave(true)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide()
    }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
      void flushEditSave(true)
    }
  }, [post.id])

  const scheduleNotice =
    postStatus === 'scheduled' && resolvedSchedule
      ? formatScheduleNotice(resolvedSchedule, selected?.username || post.collected_by)
      : ''

  const tabs: { id: Tab; label: string }[] = [
    { id: 'original', label: '원문 뜯어보기' },
    { id: 'rewrite', label: '내 글로 바꾸기' },
  ]

  function openTab(next: Tab) {
    setTab(next)
    // push so browser/back and ← 스레드 walk tab changes one step at a time
    router.push(`/threads/${post.id}/edit?tab=${next}`, { scroll: false })
  }

  async function persist(
    status: 'editing' | 'ready' | 'scheduled' | 'uploaded',
    scheduledAt?: string | null,
    opts?: { refresh?: boolean },
  ) {
    setSaving(true)
    setMessage('')
    if (status === 'scheduled' && scheduledAt) {
      writeStoredSchedule(post.id, scheduledAt)
    }
    if (status === 'ready' || status === 'editing') {
      clearStoredSchedule(post.id)
    }
    const body: Record<string, unknown> = {
      caption,
      status,
      collected_by: selected?.username,
    }
    if (scheduledAt !== undefined) body.scheduled_at = scheduledAt
    const res = await fetch(`/api/threads/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMessage(data.error || '저장에 실패했습니다.')
      return false
    }
    const savedAt =
      typeof data?.post?.scheduled_at === 'string' ? data.post.scheduled_at : scheduledAt
    if (status === 'scheduled' && savedAt) {
      writeStoredSchedule(post.id, savedAt)
      const when = parseScheduleDate(savedAt)
      if (when) {
        setResolvedSchedule(when)
        setScheduleAt(when)
      }
    }
    if (status === 'ready' || status === 'editing') {
      setResolvedSchedule(null)
    }
    rememberDraft()
    setPostStatus(status)
    if (status === 'uploaded' || status === 'scheduled') statusLockRef.current = true
    if (status === 'ready' || status === 'editing') statusLockRef.current = false
    // Skip soft refresh when the caller is about to hard-navigate away (avoids flicker).
    if (opts?.refresh !== false) router.refresh()
    return true
  }

  async function cancelReservation() {
    clearStoredSchedule(post.id)
    setResolvedSchedule(null)
    const ok = await persist('ready', null)
    if (ok) {
      setMessage(
        '모스템 예약을 취소했습니다. Threads 임시 저장본에 남은 예약은 Threads에서 직접 취소해 주세요.',
      )
    }
  }

  async function publishViaExtension() {
    if (!selected) {
      setMessage('설정에서 올릴 스레드 아이디를 먼저 연결하세요.')
      return
    }
    if (!caption.trim()) {
      setMessage('올릴 글이 없습니다.')
      return
    }
    if (!isHamiOnline()) {
      setMessage('발행하려면 하미 확장이 필요해요. chrome://extensions에서 켠 뒤 이 창을 다시 열어 주세요.')
      return
    }
    const items = [
      ...sourceMedia.filter((item) => !hiddenSource.includes(item.url)),
      ...extraMedia,
    ]
    if (items.length && !hamiSupportsMediaPublish()) {
      setMessage('하미 0.2.31이 필요합니다. chrome://extensions에서 하미를 새로고침한 뒤 Threads 탭을 모두 닫고 다시 열어 주세요.')
      return
    }
    const publishItems: Array<{
      url: string
      sourceUrl?: string
      posterUrl?: string
      type: 'image' | 'video'
      filename: string
    }> = []
    const seen = new Set<string>()
    for (const item of items) {
      const raw = item.url
      if (!raw || seen.has(raw)) continue
      seen.add(raw)
      publishItems.push({
        url: publishMediaUrl(raw, item.type),
        sourceUrl: raw.startsWith('http') ? raw : undefined,
        posterUrl: item.poster ? publishMediaUrl(item.poster, 'image') : undefined,
        type: item.type,
        filename:
          item.type === 'video'
            ? `video-${publishItems.length + 1}.mp4`
            : `image-${publishItems.length + 1}.jpg`,
      })
    }
    // Original post media must all go up — video and photos together.
    const videos = publishItems.filter((item) => item.type === 'video')
    const images = publishItems.filter((item) => item.type === 'image')
    const mediaForPublish = videos.length ? [...videos, ...images] : publishItems
    setSaving(true)
    setMessage(
      mediaForPublish.some((item) => item.type === 'video') &&
        mediaForPublish.some((item) => item.type === 'image')
        ? 'Threads 작성창을 여는 중입니다. 영상과 사진을 함께 첨부합니다.'
        : mediaForPublish.some((item) => item.type === 'video')
          ? 'Threads 작성창을 여는 중입니다. 영상을 자동 첨부합니다.'
          : mediaForPublish.length
            ? 'Threads 작성창을 여는 중입니다. 사진은 자동 첨부됩니다.'
            : 'Threads 작성창을 여는 중입니다.'
    )
    const published = await requestHamiPublish({
      text: caption,
      username: selected.username,
      media: mediaForPublish,
    })
    if (!published.ok) {
      setSaving(false)
      setMessage(published.error || '업로드에 실패했습니다.')
      return
    }
    const res = await fetch('/api/threads/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: post.id,
        caption,
        username: selected.username,
      }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMessage(data.error || '올렸지만 상태 저장에 실패했습니다.')
      return
    }
    setPublishOpen(false)
    setMessage(`@${selected.username} 스레드에 올렸습니다.`)
    statusLockRef.current = true
    rememberDraft()
    router.refresh()
  }

  function collectPublishMedia() {
    const items = [
      ...sourceMedia.filter((item) => !hiddenSource.includes(item.url)),
      ...extraMedia,
    ]
    const publishItems: Array<{
      url: string
      sourceUrl?: string
      posterUrl?: string
      type: 'image' | 'video'
      filename: string
    }> = []
    const seen = new Set<string>()
    for (const item of items) {
      const raw = item.url
      if (!raw || seen.has(raw)) continue
      seen.add(raw)
      publishItems.push({
        url: publishMediaUrl(raw, item.type),
        sourceUrl: raw.startsWith('http') ? raw : undefined,
        posterUrl: item.poster ? publishMediaUrl(item.poster, 'image') : undefined,
        type: item.type,
        filename:
          item.type === 'video'
            ? `video-${publishItems.length + 1}.mp4`
            : `image-${publishItems.length + 1}.jpg`,
      })
    }
    const videos = publishItems.filter((item) => item.type === 'video')
    const images = publishItems.filter((item) => item.type === 'image')
    return videos.length ? [...videos, ...images] : publishItems
  }

  async function scheduleViaExtension(when: Date) {
    const fail = (text: string) => {
      setScheduleFeedback(text)
      setMessage(text)
      return false
    }
    if (!selected) {
      return fail('설정에서 올릴 스레드 아이디를 먼저 연결하세요.')
    }
    if (!caption.trim()) {
      return fail('예약할 글이 없습니다.')
    }
    if (!isHamiOnline()) {
      return fail(
        '예약하려면 하미 확장이 필요해요. chrome://extensions에서 하미를 새로고침(0.2.31)한 뒤 이 창을 Ctrl+F5 하세요.',
      )
    }
    if (!hamiSupportsNativeSchedule()) {
      return fail(
        '하미 0.2.31이 필요합니다. chrome://extensions에서 하미를 새로고침한 뒤 Threads 탭을 모두 닫고 다시 열어 주세요.',
      )
    }
    const mediaForPublish = collectPublishMedia()
    if (mediaForPublish.length && !hamiSupportsMediaPublish()) {
      return fail(
        '하미 0.2.31이 필요합니다. chrome://extensions에서 하미를 새로고침한 뒤 다시 시도해 주세요.',
      )
    }

    // HypeDuck path: register on Threads first. Only then mark Mostem scheduled.
    setSaving(true)
    const progress = mediaForPublish.length
      ? 'Threads 창을 열어 예약을 등록하는 중… (미디어 업로드 포함, 잠시 기다려 주세요)'
      : 'Threads 창을 열어 예약을 등록하는 중…'
    setScheduleFeedback(progress)
    setMessage(progress)
    try {
      const scheduled = await requestHamiSchedule({
        text: caption,
        username: selected.username,
        media: mediaForPublish,
        scheduleAt: when,
      })
      if (!scheduled.ok) {
        return fail(
          scheduled.error
            ? `Threads 예약 등록 실패: ${scheduled.error}`
            : 'Threads 예약 등록에 실패했습니다. 하미·Threads 로그인을 확인한 뒤 다시 시도해 주세요.',
        )
      }

      const iso = when.toISOString()
      writeStoredSchedule(post.id, iso)
      setResolvedSchedule(when)
      setScheduleAt(when)
      // No soft refresh — hard leave to threads home so the edit shell cannot flash.
      const saved = await persist('scheduled', iso, { refresh: false })
      if (!saved) {
        return fail(
          'Threads에는 예약됐지만 모스템 저장에 실패했습니다. Threads 임시 저장본에서 확인해 주세요.',
        )
      }

      setScheduleFeedback('')
      setMessage('')
      setScheduleOpen(false)
      rememberDraft()
      // Instant exit: scheduled row is saved; land on Threads start (수집).
      window.location.replace('/threads?status=collected')
      return true
    } finally {
      setSaving(false)
    }
  }

  async function attachCommentFile(file: File | null) {
    if (!file) return
    const lower = file.name.toLowerCase()
    if (!/\.(xlsx|xls|csv|txt)$/.test(lower)) {
      setMessage('댓글 파일은 xlsx/csv만 첨부할 수 있어요.')
      return
    }
    if (file.size > MAX_COMMENT_FILE_BYTES) {
      setMessage('댓글 파일은 5MB 이하만 첨부할 수 있어요.')
      return
    }
    try {
      const base64 = await fileToBase64(file)
      setCommentFile({ name: file.name, base64 })
      setMessage(`댓글 파일 첨부됨: ${file.name}`)
    } catch {
      setMessage('댓글 파일을 읽지 못했습니다.')
    }
  }

  function onCommentDragOver(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    if (!commentDropActive) setCommentDropActive(true)
  }

  function onCommentDragLeave(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    const next = event.relatedTarget as Node | null
    if (next && event.currentTarget.contains(next)) return
    setCommentDropActive(false)
  }

  function onCommentDrop(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    setCommentDropActive(false)
    const file = event.dataTransfer.files?.[0] ?? null
    void attachCommentFile(file)
  }

  async function generate() {
    setSaving(true)
    setMessage('')
    const media = [
      ...sourceMedia.filter((item) => !hiddenSource.includes(item.url)),
      ...extraMedia,
    ]
      .filter((item) => /^https?:\/\//i.test(item.url) || (item.poster ? /^https?:\/\//i.test(item.poster) : false))
      .map((item) => ({
        url: item.url,
        type: item.type,
        poster: item.poster,
        videoUrl: item.type === 'video' ? item.url : undefined,
      }))
    const res = await fetch('/api/threads/rewrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: originalCaption,
        instruction,
        guide: selectedGuide?.content || '',
        guideName: selectedGuide?.name || '',
        persona: selected?.intro || selected?.username,
        model: modelId,
        webSearch,
        media,
        commentsFile: commentFile?.base64 || undefined,
        commentsFilename: commentFile?.name || undefined,
      }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMessage(data.error || '생성에 실패했습니다.')
      return
    }
    const next = (data.drafts as string[] | undefined) ?? [caption]
    const nextDrafts: [string, string, string] = [next[0] ?? '', next[1] ?? '', next[2] ?? '']
    const run: GenerateRun = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: Date.now(),
      model: typeof data.model === 'string' ? data.model : modelId,
      instruction: instruction.trim(),
      drafts: nextDrafts,
    }
    const nextHistory = [run, ...history].slice(0, 20)
    setDrafts(nextDrafts)
    setDraftIndex(0)
    setCaption(nextDrafts[0] || caption)
    setHistory(nextHistory)
    writeEditDraft(post.id, {
      original: sourceCaption || post.caption || '',
      drafts: nextDrafts,
      draftIndex: 0,
      hiddenSource,
      history: nextHistory,
      replies: replies.map((item) => item.text),
    })
    const parts: string[] = []
    if (typeof data.mediaCount === 'number' && data.mediaCount > 0) parts.push(`미디어 ${data.mediaCount}`)
    if (typeof data.commentsCount === 'number' && data.commentsCount > 0) {
      parts.push(`댓글 ${data.commentsCount}`)
    }
    setMessage(parts.length ? `초안이 생성되었습니다. (${parts.join(' · ')} 반영)` : '초안이 생성되었습니다.')
  }

  function downloadZip() {
    const blob = new Blob(
      [`계정: @${selected?.username ?? '미선택'}\n\n${caption}\n\n원문: ${post.url ?? ''}`],
      { type: 'text/plain;charset=utf-8' }
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `mostem-${post.author || 'thread'}.txt`
    a.click()
  }

  const previewName = selected ? `@${selected.username}` : '내 계정'
  const selectedGuide = guides.find((item) => item.id === guideId) ?? pickDefaultGuide(guides)
  const visibleSource = sourceMedia.filter((item) => !hiddenSource.includes(item.url))
  const previewMedia = [...visibleSource, ...extraMedia]
  const previewThumb =
    displaySrc(previewMedia[0]?.poster || previewMedia[0]?.url) || thumb

  useEffect(() => {
    let alive = true
    void fetch('/api/ai-guides', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!alive || !Array.isArray(data.guides) || !data.guides.length) return
        setGuides(data.guides)
        setGuideId((current) => {
          if (data.guides.some((item: AiGuide) => item.id === current)) return current
          return pickDefaultGuide(data.guides).id
        })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  function insertTemplate(body: string) {
    setReplies((prev) => {
      if (prev.length >= MAX_THREAD_REPLIES) {
        setMessage('타래는 최대 10개까지예요.')
        return prev
      }
      const emptyIdx = prev.findIndex((item) => !item.text.trim())
      if (emptyIdx >= 0) {
        const next = prev.map((item, index) => (index === emptyIdx ? { ...item, text: body } : item))
        setMessage(`${emptyIdx + 2}번 타래에 넣었어요`)
        return next
      }
      const next = [...prev, { id: newReplyId(), text: body }]
      setMessage(`${next.length + 1}번 타래에 넣었어요`)
      return next
    })
  }

  function addReply() {
    setReplies((prev) => {
      if (prev.length >= MAX_THREAD_REPLIES) {
        setMessage('타래는 최대 10개까지예요.')
        return prev
      }
      return [...prev, { id: newReplyId(), text: '' }]
    })
  }

  function updateReply(id: string, text: string) {
    setReplies((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)))
  }

  function removeReply(id: string) {
    setReplies((prev) => prev.filter((item) => item.id !== id))
  }

  function attachFiles(files: File[]) {
    if (!files.length) return
    setExtraMedia((prev) => [
      ...prev,
      ...files.map((file) => {
        const url = URL.createObjectURL(file)
        const type = (file.type.startsWith('video/') ? 'video' : 'image') as MediaPreview['type']
        return { url, type, poster: type === 'image' ? url : undefined }
      }),
    ])
    setMessage('파일을 추가했습니다.')
  }

  function removeExtra(index: number) {
    setExtraMedia((prev) => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed?.url.startsWith('blob:')) URL.revokeObjectURL(removed.url)
      if (lightbox && removed && lightbox.url === removed.url) setLightbox(null)
      return next
    })
  }

  function removeSource(url: string) {
    setHiddenSource((prev) => (prev.includes(url) ? prev : [...prev, url]))
    if (lightbox?.url === url) setLightbox(null)
  }

  function resetEditor() {
    if (!window.confirm('지금 쓴 글과 첨부를 처음 상태로 되돌릴까요?')) return
    const original = sourceCaption || post.caption || ''
    setDrafts([original, '', ''])
    setDraftIndex(0)
    setCaption(original)
    setInstruction('')
    setExtraMedia((prev) => {
      for (const item of prev) {
        if (item.url.startsWith('blob:')) URL.revokeObjectURL(item.url)
      }
      return []
    })
    setHiddenSource([])
    setLightbox(null)
    setReplies([])
    writeEditDraft(post.id, {
      original,
      drafts: [original, '', ''],
      draftIndex: 0,
      hiddenSource: [],
      replies: [],
    })
    setMessage('처음 상태로 되돌렸습니다.')
  }

  return (
    <div className="-m-3 min-h-full bg-[#0b0b0d] md:-m-4">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="text-sm text-white/60 hover:text-white"
            onClick={() => {
              void (async () => {
                await flushEditSave()
                const before = window.location.href
                router.back()
                window.setTimeout(() => {
                  if (window.location.href === before) {
                    router.push(`/threads?status=${post.status || 'collected'}`)
                  }
                }, 280)
              })()
            }}
          >
            ← 스레드
          </button>
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openTab(item.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                tab === item.id ? 'bg-brand text-white' : 'text-white/50 hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="rounded-md bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold">편집</span>
          <button
            type="button"
            onClick={() => setShowOriginalModal(true)}
            className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/70"
          >
            @{post.author} 벤치마킹 중
          </button>
        </div>
        <div className="flex gap-2">
          <span className="hidden items-center rounded-lg bg-white/8 px-3 py-1.5 text-xs text-white/70 sm:inline-flex">
            발행대기
          </span>
          <button
            type="button"
            onClick={() => {
              setLightbox(null)
              setScheduleFeedback('')
              setSaving(false)
              pickSchedule(10)
              setScheduleOpen(true)
            }}
            className="rounded-lg border border-white/15 bg-transparent px-3 py-1.5 text-xs text-white hover:bg-white/5"
          >
            📅 예약발행
          </button>
          {postStatus === 'scheduled' ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void cancelReservation()}
              className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/30"
            >
              예약 취소
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setMessage('')
              setPublishOpen(true)
            }}
            disabled={saving}
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            ⚡ 즉시발행
          </button>
        </div>
      </div>

      {tab === 'original' && (
        <div className="grid w-full gap-4 p-4 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-[#141418] p-5">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold">
                  {(post.author?.[0] ?? 'U').toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">@{post.author}</p>
                  <p className="text-[11px] text-white/35">{date}</p>
                </div>
              </div>
              {grade && (
                <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                  {grade} {post.multiplier != null ? `${Number(post.multiplier).toFixed(1)}배` : ''}
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{originalCaption}</p>
            {sourceMedia.length ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {sourceMedia.map((item, index) => (
                  <div key={`${item.url}-${index}`} className="relative aspect-square overflow-hidden rounded-xl bg-black">
                    <MediaThumb item={item} />
                  </div>
                ))}
              </div>
            ) : thumb ? (
              <img src={thumb} alt="" className="mt-4 w-full rounded-xl object-cover" />
            ) : null}
            <p className="mt-3 text-[11px] text-white/35">
              조회 {formatCount(post.views)} · 좋아요 {formatCount(post.likes)} · 팔로워 {formatCount(post.followers)}
            </p>
          </section>
          <section className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#141418] p-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-2xl">✦</div>
            <h2 className="text-lg font-bold text-white">이 글이 왜 터졌는지 분석해 드려요</h2>
            <p className="mt-2 max-w-sm text-sm text-white/45">
              훅·글 구조·소구점을 뽑고, 내 계정에 적용할 각도까지 정리해요.
            </p>
            <button
              type="button"
              onClick={() => openTab('rewrite')}
              className="mt-6 w-full max-w-xs rounded-xl bg-brand py-3 text-sm font-semibold text-white"
            >
              분석 없이 바로 내 글로 바꾸기
            </button>
          </section>
        </div>
      )}

      {tab === 'rewrite' && (
        <div className="grid w-full min-w-0 gap-3 p-4 lg:grid-cols-[76px_minmax(0,1fr)_auto]">
          <EditToolbar
            accounts={liveAccounts}
            accountId={accountId}
            onAccount={setAccountId}
            guides={guides}
            guideId={selectedGuide.id}
            onGuide={setGuideId}
            isAdmin={isAdmin}
            onTemplate={() => setTemplateOpen(true)}
            onReset={resetEditor}
          />

          <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#141418] p-4">
            <div className="mb-3 flex gap-2">
              {[0, 1, 2].map((index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setDraftIndex(index)
                    setCaption(drafts[index] || caption)
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs ${
                    draftIndex === index ? 'bg-brand text-white' : 'bg-white/5 text-white/50'
                  }`}
                >
                  {index + 1}번째 안
                </button>
              ))}
            </div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] text-white/45">
                원본 영상 {visibleSource.filter((item) => item.type === 'video').length} · 사진{' '}
                {visibleSource.filter((item) => item.type === 'image').length}
                {extraMedia.length ? ` · 추가 ${extraMedia.length}` : ''}
              </p>
            </div>
            <div ref={mediaStripRef} className="relative mb-3 flex gap-2 overflow-x-auto">
              {visibleSource.map((item, index) => (
                <MediaHoverTile
                  key={`orig-${item.url}-${index}`}
                  item={item}
                  active={lightbox?.url === item.url}
                  onPreview={setLightbox}
                  onPreviewEnd={() => setLightbox(null)}
                  onRemove={() => removeSource(item.url)}
                  removeLabel="이미지 삭제"
                />
              ))}
              {extraMedia.map((item, index) => (
                <MediaHoverTile
                  key={`extra-${item.url}-${index}`}
                  item={item}
                  active={lightbox?.url === item.url}
                  onPreview={setLightbox}
                  onPreviewEnd={() => setLightbox(null)}
                  onRemove={() => removeExtra(index)}
                  removeLabel="첨부 삭제"
                />
              ))}
              <label className="flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 text-2xl text-white/40 hover:border-white/40 hover:text-white">
                +
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    attachFiles(Array.from(event.target.files ?? []))
                    event.target.value = ''
                  }}
                />
              </label>
            </div>
            <AutoGrowTextarea
              value={caption}
              minHeight={CAPTION_MIN_PX}
              onChange={(next) => {
                setCaption(next)
                setDrafts((prev) => prev.map((d, i) => (i === draftIndex ? next : d)))
              }}
            />

            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5">
                <p className="text-[11px] leading-snug text-white/45">
                  타래 댓글은 본문이 올라간 직후 순서대로 자동으로 달려요 — 따로 발행하지 않아도 돼요
                </p>
                <button
                  type="button"
                  onClick={addReply}
                  disabled={replies.length >= MAX_THREAD_REPLIES}
                  className="shrink-0 rounded-lg bg-black/50 px-3 py-1.5 text-[11px] font-semibold text-white/85 ring-1 ring-white/10 hover:bg-black/70 disabled:opacity-40"
                >
                  + 타래 추가 ({replies.length}/{MAX_THREAD_REPLIES})
                </button>
              </div>

              {replies.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-black/25 px-3 py-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white/70">{index + 2}번 타래</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/35">
                        {item.text.length}/{THREAD_CHAR_LIMIT}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeReply(item.id)}
                        className="rounded p-1 text-white/35 hover:bg-white/10 hover:text-white"
                        aria-label={`${index + 2}번 타래 삭제`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <AutoGrowTextarea
                    value={item.text}
                    minHeight={REPLY_MIN_PX}
                    placeholder="이어질 내용 — 추가 후기·안내·링크 등을 적어주세요"
                    onChange={(next) => updateReply(item.id, next.slice(0, THREAD_CHAR_LIMIT))}
                    className="rounded-lg border-white/8 bg-transparent px-2 py-2 placeholder:text-white/30"
                  />
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-2">
              <input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="(선택) 어떻게 바꿀까요? — 첫 문장 더 세게, 원문 줄바꿈 그대로... 안 써도 생성돼요"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
              />
              <div
                onDragEnter={onCommentDragOver}
                onDragOver={onCommentDragOver}
                onDragLeave={onCommentDragLeave}
                onDrop={onCommentDrop}
                className={`rounded-xl border border-dashed px-3 py-2.5 transition-colors ${
                  commentDropActive
                    ? 'border-brand bg-brand/15'
                    : 'border-white/15 bg-white/[0.03]'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-2.5 text-[11px] text-white/80 hover:bg-white/12">
                    <Paperclip className="h-3.5 w-3.5" />
                    댓글 파일
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                      className="sr-only"
                      onChange={(event) => {
                        void attachCommentFile(event.target.files?.[0] ?? null)
                        event.target.value = ''
                      }}
                    />
                  </label>
                  {commentFile ? (
                    <span className="inline-flex max-w-[min(280px,100%)] items-center gap-1 rounded-lg bg-brand/15 px-2 py-1.5 text-[11px] text-brand">
                      <span className="truncate">{commentFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setCommentFile(null)}
                        className="rounded p-0.5 hover:bg-white/10"
                        aria-label="댓글 파일 제거"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/40">
                      {commentDropActive
                        ? '여기에 놓으면 첨부됩니다'
                        : '다운로드 파일 끌어다 놓기 · 또는 클릭'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ModelPicker value={modelId} onChange={setModelId} />
                <button
                  type="button"
                  onClick={() => setWebSearch((value) => !value)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] ${
                    webSearch ? 'bg-brand/20 text-brand' : 'bg-white/8 text-white/55 hover:text-white'
                  }`}
                >
                  웹검색
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="ml-auto rounded-xl border border-white/15 px-3 py-2 text-xs text-white/80 hover:bg-white/5"
                >
                  기록{history.length ? ` ${history.length}` : ''}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={generate}
                  className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {saving ? '생성 중' : '생성'}
                </button>
              </div>
            </div>
            {scheduleNotice ? <p className="mt-2 text-xs text-gold">{scheduleNotice}</p> : null}
            {message && message !== scheduleNotice ? (
              <p className="mt-2 text-xs text-gold">{message}</p>
            ) : null}
          </section>

          <aside className="w-[300px] shrink-0 overflow-auto rounded-2xl border border-white/10 bg-[#141418] p-3">
            <p className="mb-2 px-1 text-[11px] text-white/40">발행하면 내 프로필에 이렇게 올라가요</p>
            <div className="rounded-[26px] border border-white/10 bg-black px-2.5 py-3">
              {/* 1번 본문 카드 */}
              <div className="relative flex gap-2">
                <div className="flex w-9 shrink-0 flex-col items-center">
                  <PreviewAccountAvatar account={selected} />
                  {replies.length > 0 ? (
                    <div className="mt-1 w-0.5 flex-1 min-h-[16px] rounded-full bg-white/15" aria-hidden />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 pb-3">
                  <div className="flex items-baseline gap-1.5">
                    <p className="truncate text-xs font-semibold text-white">{previewName}</p>
                    <p className="shrink-0 text-[10px] text-white/30">지금</p>
                  </div>
                  <p className="mt-1.5 min-h-[72px] whitespace-pre-wrap break-words text-sm leading-snug text-white/85">
                    {caption || '작성된 글이 여기에 보여요'}
                  </p>

                  {/* 미디어: 고정 정사각, 여러 장이면 가로로만 이어 스크롤 */}
                  {previewMedia.length > 0 ? (
                    <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {previewMedia.map((item, index) => (
                        <div
                          key={`${item.url}-${index}`}
                          className="relative h-[96px] w-[96px] shrink-0 overflow-hidden rounded-xl bg-white/5"
                        >
                          <MediaThumb item={item} />
                        </div>
                      ))}
                    </div>
                  ) : previewThumb ? (
                    <div className="relative mt-2 h-[96px] w-[96px] overflow-hidden rounded-xl bg-white/5">
                      <img src={previewThumb} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : null}

                  <p className="mt-2 text-right text-[10px] text-white/30">{caption.length}/500</p>
                </div>
              </div>

              {/* 타래: 추가하는 즉시 바로 아래로 이어짐 */}
              {replies.map((item, index) => {
                const body = item.text.trim()
                const isLast = index === replies.length - 1
                return (
                  <div key={item.id} className="relative flex gap-2">
                    <div className="flex w-9 shrink-0 flex-col items-center">
                      <PreviewAccountAvatar account={selected} />
                      {!isLast ? (
                        <div className="mt-1 w-0.5 flex-1 min-h-[16px] rounded-full bg-white/15" aria-hidden />
                      ) : null}
                    </div>
                    <div className={cn('min-w-0 flex-1', isLast ? 'pb-0.5' : 'pb-3')}>
                      <div className="flex items-baseline gap-1.5">
                        <p className="truncate text-xs font-semibold text-white">{previewName}</p>
                        <p className="shrink-0 text-[10px] text-white/30">지금</p>
                        <p className="ml-auto shrink-0 text-[10px] text-white/25">{index + 2}번</p>
                      </div>
                      <p
                        className={cn(
                          'mt-1.5 min-h-[48px] whitespace-pre-wrap break-words text-sm leading-snug',
                          body ? 'text-white/85' : 'text-white/30'
                        )}
                      >
                        {body || '타래 내용을 입력하면 여기에 보여요'}
                      </p>
                      {body ? (
                        <p className="mt-1.5 text-right text-[10px] text-white/30">
                          {item.text.length}/{THREAD_CHAR_LIMIT}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>
        </div>
      )}
      </div>

      {publishOpen && (
        <PublishModal
          account={selected}
          saving={saving}
          message={message}
          onClose={() => setPublishOpen(false)}
          onExtensionUpload={() => void publishViaExtension()}
          onDownload={downloadZip}
        />
      )}

      {scheduleOpen && (
        <ScheduleModal
          account={selected}
          saving={saving}
          feedback={scheduleFeedback}
          initialAt={scheduleAt}
          onClose={() => {
            if (!saving) {
              setScheduleOpen(false)
              setScheduleFeedback('')
            }
          }}
          onConfirm={async (when) => {
            await scheduleViaExtension(when)
          }}
        />
      )}

      <HoverPreview item={lightbox} anchor={mediaStripRef.current} />

      {templateOpen ? (
        <TemplateModal
          onClose={() => setTemplateOpen(false)}
          onInsert={insertTemplate}
          isAdmin={isAdmin}
        />
      ) : null}

      {historyOpen ? (
        <GenerateHistoryModal
          runs={history}
          onClose={() => setHistoryOpen(false)}
          onApply={(run) => {
            setDrafts(run.drafts)
            setDraftIndex(0)
            setCaption(run.drafts[0] || '')
            setHistoryOpen(false)
            setMessage('이전 생성 기록을 불러왔습니다.')
          }}
        />
      ) : null}

      {showOriginalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#141418] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">벤치마킹 원문</h2>
              <button type="button" onClick={() => setShowOriginalModal(false)} className="text-white/40">
                ✕
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">@{post.author}</p>
                <p className="text-[11px] text-white/35">{date}</p>
              </div>
              {grade && (
                <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                  {grade} {post.multiplier != null ? `${Number(post.multiplier).toFixed(1)}배` : ''}
                </span>
              )}
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm text-white/80">{originalCaption}</p>
            {(displaySrc(sourceMedia[0]?.poster || sourceMedia[0]?.url) || thumb) && (
              <img
                src={displaySrc(sourceMedia[0]?.poster || sourceMedia[0]?.url) || thumb || ''}
                alt=""
                referrerPolicy="no-referrer"
                className="mt-4 w-full rounded-xl object-cover"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
