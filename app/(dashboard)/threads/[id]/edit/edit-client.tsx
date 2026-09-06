'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GRADE_LABEL, formatCount, mediaSrc } from '@/lib/collect-labels'
import { cleanMediaUrl, imagePosterUrl, isVideoFile, parseMediaItems } from '@/lib/collect-media'
import { DEFAULT_AI_GUIDES, pickDefaultGuide, type AiGuide } from '@/lib/ai-guides'
import type { CollectedPost, ConnectedAccount } from '@/types'
import { DEFAULT_AI_MODEL } from '@/lib/ai-models'
import { readEditDraft, writeEditDraft, type GenerateRun } from '@/lib/edit-drafts'
import { GenerateHistoryModal } from './generate-history-modal'
import {
  hamiSupportsMediaPublish,
  isHamiOnline,
  publishMediaUrl,
  requestHamiPublish,
} from '@/lib/threads-publish'
import { EditToolbar } from './edit-toolbar'
import { ModelPicker } from './model-picker'
import { PublishModal } from './publish-modal'
import { ScheduleModal } from './schedule-modal'
import { TemplateModal } from './template-modal'

type Tab = 'original' | 'rewrite' | 'publish'
type MediaPreview = { url: string; type: 'image' | 'video'; poster?: string }

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
  isAdmin = false,
}: {
  post: CollectedPost
  accounts: ConnectedAccount[]
  initialTab?: Tab
  isAdmin?: boolean
}) {
  const router = useRouter()
  const sourceMedia = useMemo(() => originalMedia(post), [post])
  const [tab, setTab] = useState<Tab>(initialTab ?? 'original')
  const [caption, setCaption] = useState(post.caption ?? '')
  const [drafts, setDrafts] = useState<string[]>([post.caption ?? '', '', ''])
  const [draftIndex, setDraftIndex] = useState(0)
  const [sourceCaption, setSourceCaption] = useState(
    post.caption && post.caption !== post.author ? post.caption : ''
  )
  const [instruction, setInstruction] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [guides, setGuides] = useState<AiGuide[]>(DEFAULT_AI_GUIDES)
  const [guideId, setGuideId] = useState(pickDefaultGuide(DEFAULT_AI_GUIDES).id)
  const [extraMedia, setExtraMedia] = useState<MediaPreview[]>([])
  const [hiddenSource, setHiddenSource] = useState<string[]>([])
  const [lightbox, setLightbox] = useState<MediaPreview | null>(null)
  const mediaStripRef = useRef<HTMLDivElement>(null)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [modelId, setModelId] = useState(DEFAULT_AI_MODEL.id)
  const [webSearch, setWebSearch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showOriginalModal, setShowOriginalModal] = useState(initialTab === 'original-modal' as Tab)
  const [publishOpen, setPublishOpen] = useState(initialTab === 'publish')
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleAt, setScheduleAt] = useState(() => new Date(Date.now() + 10 * 60 * 1000))
  const [history, setHistory] = useState<GenerateRun[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

  function pickSchedule(mins: number) {
    setScheduleAt(new Date(Date.now() + mins * 60 * 1000))
  }

  const thumb = mediaSrc(post.thumbnail_url)
  const selected = accounts.find((a) => a.id === accountId)
  const grade = post.grade ? GRADE_LABEL[post.grade] : null
  const date = post.collected_at ? new Date(post.collected_at).toISOString().slice(0, 10) : ''
  const originalCaption = sourceCaption || '본문 없음'
  const statusLockRef = useRef(post.status === 'uploaded' || post.status === 'scheduled')
  const captionRef = useRef(caption)
  const draftsRef = useRef(drafts)
  const draftIndexRef = useRef(draftIndex)
  const hiddenSourceRef = useRef(hiddenSource)
  const sourceCaptionRef = useRef(sourceCaption)
  const historyRef = useRef(history)
  const accountRef = useRef(selected?.username)
  captionRef.current = caption
  draftsRef.current = drafts
  draftIndexRef.current = draftIndex
  hiddenSourceRef.current = hiddenSource
  sourceCaptionRef.current = sourceCaption
  historyRef.current = history
  accountRef.current = selected?.username

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
  }, [post.id])

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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'original', label: '원문 뜯어보기' },
    { id: 'rewrite', label: '내 글로 바꾸기' },
    { id: 'publish', label: '올리기' },
  ]

  function openTab(next: Tab) {
    setTab(next)
    setPublishOpen(next === 'publish')
    router.replace(`/threads/${post.id}/edit?tab=${next}`, { scroll: false })
  }

  async function persist(status: 'editing' | 'ready' | 'scheduled' | 'uploaded') {
    setSaving(true)
    setMessage('')
    const res = await fetch(`/api/threads/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption,
        status,
        collected_by: selected?.username,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setMessage(data.error || '저장에 실패했습니다.')
      return false
    }
    rememberDraft()
    if (status === 'uploaded' || status === 'scheduled') statusLockRef.current = true
    router.refresh()
    return true
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
      setMessage('영상·사진을 같이 올리려면 하미를 0.2.4로 다시 받고 chrome://extensions에서 새로고침해 주세요.')
      return
    }
    setSaving(true)
    setMessage(items.length ? '영상·사진을 첨부해 올리는 중...' : '')
    const published = await requestHamiPublish({
      text: caption,
      username: selected.username,
      media: items.map((item, index) => ({
        url: publishMediaUrl(item.url),
        sourceUrl: item.url.startsWith('http') ? item.url : undefined,
        type: item.type,
        filename:
          item.type === 'video'
            ? `video-${index + 1}.mp4`
            : `image-${index + 1}.jpg`,
      })),
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

  async function generate() {
    setSaving(true)
    setMessage('')
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
    })
    setMessage('초안이 생성되었습니다.')
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
    const next = caption.trim() ? `${caption.trim()}\n\n${body}` : body
    setCaption(next)
    setDrafts((prev) => prev.map((item, index) => (index === draftIndex ? next : item)))
    setMessage('템플릿을 타래에 넣었습니다.')
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
    writeEditDraft(post.id, {
      original,
      drafts: [original, '', ''],
      draftIndex: 0,
      hiddenSource: [],
    })
    setMessage('처음 상태로 되돌렸습니다.')
  }

  return (
    <div className="-m-3 min-h-full bg-[#0b0b0d] md:-m-4">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/threads?status=editing"
            className="text-sm text-white/60 hover:text-white"
            onClick={(event) => {
              event.preventDefault()
              void (async () => {
                await flushEditSave()
                router.push('/threads?status=editing')
              })()
            }}
          >
            ← 스레드
          </Link>
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
              pickSchedule(10)
              setScheduleOpen(true)
            }}
            className="rounded-lg border border-white/15 bg-transparent px-3 py-1.5 text-xs text-white hover:bg-white/5"
          >
            📅 예약발행
          </button>
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
        <div className="grid w-full gap-3 p-4 lg:grid-cols-[76px_minmax(0,1fr)_280px]">
          <EditToolbar
            accounts={accounts}
            accountId={accountId}
            onAccount={setAccountId}
            guides={guides}
            guideId={selectedGuide.id}
            onGuide={setGuideId}
            isAdmin={isAdmin}
            onTemplate={() => setTemplateOpen(true)}
            onReset={resetEditor}
          />

          <section className="rounded-2xl border border-white/10 bg-[#141418] p-4">
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
            <textarea
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value)
                setDrafts((prev) => prev.map((d, i) => (i === draftIndex ? e.target.value : d)))
              }}
              rows={14}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-brand"
            />
            <div className="mt-3 space-y-2">
              <input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="(선택) 어떻게 바꿀까요? — 첫 문장 더 세게, 원문 줄바꿈 그대로... 안 써도 생성돼요"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
              />
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
            {message && <p className="mt-2 text-xs text-gold">{message}</p>}
          </section>

          <aside className="rounded-2xl border border-white/10 bg-[#141418] p-4">
            <p className="mb-3 text-xs text-white/40">발행하면 내 프로필에 이렇게 올라가요</p>
            <div className="rounded-[28px] border border-white/10 bg-black p-4">
              <p className="text-xs font-semibold text-white">{previewName}</p>
              <p className="mt-1 text-[10px] text-white/30">지금</p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-white/80">{caption || '작성된 글이 여기에 보여요'}</p>
              {previewMedia.length ? (
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {previewMedia.map((item, index) => (
                    <div key={`${item.url}-${index}`} className="relative aspect-square overflow-hidden rounded-lg bg-white/5">
                      <MediaThumb item={item} />
                    </div>
                  ))}
                </div>
              ) : previewThumb ? (
                <img src={previewThumb} alt="" className="mt-3 w-full rounded-lg object-cover" />
              ) : null}
              <p className="mt-4 text-right text-[10px] text-white/30">{caption.length}/500</p>
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
          initialAt={scheduleAt}
          onClose={() => setScheduleOpen(false)}
          onConfirm={async (when) => {
            setScheduleAt(when)
            const ok = await persist('scheduled')
            if (ok) {
              setMessage(`${when.toLocaleString('ko-KR')}에 @${selected?.username} 계정으로 예약했습니다.`)
              setScheduleOpen(false)
            }
          }}
        />
      )}

      <HoverPreview item={lightbox} anchor={mediaStripRef.current} />

      {templateOpen ? (
        <TemplateModal onClose={() => setTemplateOpen(false)} onInsert={insertTemplate} />
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
