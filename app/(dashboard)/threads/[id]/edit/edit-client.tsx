'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { GRADE_LABEL, formatCount, mediaSrc } from '@/lib/collect-labels'
import { DEFAULT_AI_GUIDES, pickDefaultGuide, type AiGuide } from '@/lib/ai-guides'
import type { CollectedPost, ConnectedAccount } from '@/types'
import { DEFAULT_AI_MODEL } from '@/lib/ai-models'
import { EditToolbar } from './edit-toolbar'
import { ImportModal } from './import-modal'
import { ModelPicker } from './model-picker'
import { TemplateModal } from './template-modal'

type Tab = 'original' | 'rewrite' | 'publish'
type MediaPreview = { url: string; type: 'image' | 'video' }

function originalMedia(post: CollectedPost): MediaPreview[] {
  const items: MediaPreview[] = []
  for (const item of post.media_items ?? []) {
    const url = item.poster || item.url || item.videoUrl
    if (!url) continue
    items.push({ url, type: item.type === 'video' ? 'video' : 'image' })
  }
  if (post.thumbnail_url && !items.some((item) => item.url === post.thumbnail_url)) {
    items.unshift({ url: post.thumbnail_url, type: 'image' })
  }
  if (post.media_url && !items.some((item) => item.url === post.media_url)) {
    items.push({
      url: post.media_url,
      type: /\.(mp4|webm|mov)(\?|$)/i.test(post.media_url) ? 'video' : 'image',
    })
  }
  return items
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
  const [instruction, setInstruction] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [guides, setGuides] = useState<AiGuide[]>(DEFAULT_AI_GUIDES)
  const [guideId, setGuideId] = useState(pickDefaultGuide(DEFAULT_AI_GUIDES).id)
  const [mediaMode, setMediaMode] = useState<'original' | 'custom'>('original')
  const [customMedia, setCustomMedia] = useState<MediaPreview[]>([])
  const [templateOpen, setTemplateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [modelId, setModelId] = useState(DEFAULT_AI_MODEL.id)
  const [webSearch, setWebSearch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showOriginalModal, setShowOriginalModal] = useState(initialTab === 'original-modal' as Tab)
  const [publishOpen, setPublishOpen] = useState(initialTab === 'publish')
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleMins, setScheduleMins] = useState(10)
  const [scheduleAt, setScheduleAt] = useState(() => new Date(Date.now() + 10 * 60 * 1000))

  function pickSchedule(mins: number) {
    setScheduleMins(mins)
    setScheduleAt(new Date(Date.now() + mins * 60 * 1000))
  }

  const thumb = mediaSrc(post.thumbnail_url)
  const selected = accounts.find((a) => a.id === accountId)
  const grade = post.grade ? GRADE_LABEL[post.grade] : null
  const date = post.collected_at ? new Date(post.collected_at).toISOString().slice(0, 10) : ''
  const originalCaption =
    post.caption && post.caption !== post.author ? post.caption : '본문 없음'

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
    router.refresh()
    return true
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
    setDrafts([next[0] ?? '', next[1] ?? '', next[2] ?? ''])
    setDraftIndex(0)
    setCaption(next[0] ?? caption)
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
  const previewMedia = mediaMode === 'custom' ? customMedia : sourceMedia
  const previewThumb = previewMedia[0]?.url ? mediaSrc(previewMedia[0].url) : thumb

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
    setCustomMedia((prev) => {
      for (const item of prev) {
        if (item.url.startsWith('blob:')) URL.revokeObjectURL(item.url)
      }
      return files.map((file) => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image',
      }))
    })
    setMediaMode('custom')
    setMessage('직접 첨부한 파일을 씁니다.')
  }

  function resetEditor() {
    if (!window.confirm('지금 쓴 글과 첨부를 처음 상태로 되돌릴까요?')) return
    setDrafts([post.caption ?? '', '', ''])
    setDraftIndex(0)
    setCaption(post.caption ?? '')
    setInstruction('')
    setMediaMode('original')
    setCustomMedia((prev) => {
      for (const item of prev) {
        if (item.url.startsWith('blob:')) URL.revokeObjectURL(item.url)
      }
      return []
    })
    setMessage('처음 상태로 되돌렸습니다.')
  }

  return (
    <div className="-m-4 md:-m-6 min-h-full bg-[#0b0b0d]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/threads" className="text-sm text-white/60 hover:text-white">
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
              pickSchedule(10)
              setScheduleOpen(true)
            }}
            className="rounded-lg border border-white/15 bg-transparent px-3 py-1.5 text-xs text-white hover:bg-white/5"
          >
            📅 예약발행
          </button>
          <button
            type="button"
            onClick={() => openTab('publish')}
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white"
          >
            ⚡ 즉시발행
          </button>
        </div>
      </div>

      {tab === 'original' && (
        <div className="mx-auto w-full px-4 py-4 md:px-5 md:py-5">
        <div className="mx-auto grid w-[840px] max-w-full gap-4 md:grid-cols-2">
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
            {thumb && <img src={thumb} alt="" className="mt-4 w-full rounded-xl object-cover" />}
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
        </div>
      )}

      {tab === 'rewrite' && (
        <div className="mx-auto w-full px-4 py-4 md:px-5 md:py-5">
        <div className="mx-auto grid w-[840px] max-w-full gap-3 lg:grid-cols-[76px_minmax(0,1fr)_280px]">
          <EditToolbar
            accounts={accounts}
            accountId={accountId}
            onAccount={setAccountId}
            guides={guides}
            guideId={selectedGuide.id}
            onGuide={setGuideId}
            isAdmin={isAdmin}
            onImport={() => setImportOpen(true)}
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
            {previewMedia.length ? (
              <div className="mb-3 flex gap-2 overflow-x-auto">
                {previewMedia.map((item, index) => (
                  <div
                    key={`${item.url}-${index}`}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white/5"
                  >
                    {item.type === 'video' ? (
                      <video src={item.url} muted className="h-full w-full object-cover" />
                    ) : (
                      <img src={mediaSrc(item.url) || item.url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            ) : null}
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
                  disabled={saving}
                  onClick={generate}
                  className="ml-auto rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
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
              {previewThumb ? <img src={previewThumb} alt="" className="mt-3 w-full rounded-lg object-cover" /> : null}
              <p className="mt-4 text-right text-[10px] text-white/30">{caption.length}/500</p>
            </div>
          </aside>
        </div>
        </div>
      )}

      {publishOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#141418] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">발행하기</h2>
              <button type="button" onClick={() => setPublishOpen(false)} className="text-white/40">
                ✕
              </button>
            </div>
            <div className="mb-4 rounded-xl bg-white/5 p-3">
              <p className="text-sm font-semibold text-white">@{selected?.username ?? '계정 미선택'}</p>
              <p className="text-xs text-white/45">이 계정에 올라가요</p>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => persist('uploaded')}
                className="w-full rounded-xl border border-white/10 px-4 py-3 text-left"
              >
                <p className="text-sm font-semibold text-white">확장프로그램으로 업로드</p>
                <p className="text-xs text-white/40">하미가 응답하면 이 글을 선택한 계정으로 올립니다.</p>
              </button>
              <button
                type="button"
                onClick={() => persist('uploaded')}
                className="w-full rounded-xl border border-white/10 px-4 py-3 text-left"
              >
                <p className="text-sm font-semibold text-white">Threads 공식 발행</p>
                <p className="text-xs text-white/40">연결한 계정으로 서버에서 바로 올리는 경로입니다.</p>
              </button>
              <button
                type="button"
                onClick={downloadZip}
                className="w-full rounded-xl border border-white/10 px-4 py-3 text-left"
              >
                <p className="text-sm font-semibold text-white">압축파일로 다운로드</p>
                <p className="text-xs text-white/40">글·원문 링크를 저장한 뒤 직접 게시하세요.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {scheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141418] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">예약 발행</h2>
              <button type="button" onClick={() => setScheduleOpen(false)} className="text-white/40">
                ✕
              </button>
            </div>

            <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold">
                {(selected?.username?.[0] ?? '나').toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">@{selected?.username ?? '계정 미선택'}</p>
                <p className="text-xs text-white/45">이 계정에 예약돼요</p>
              </div>
            </div>

            <p className="mb-2 text-xs text-white/40">예약 시작</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                [10, '10분 뒤'],
                [30, '30분 뒤'],
                [60, '1시간 뒤'],
                [120, '2시간 뒤'],
                [180, '3시간 뒤'],
              ].map(([mins, label]) => (
                <button
                  key={String(label)}
                  type="button"
                  onClick={() => pickSchedule(Number(mins))}
                  className={`rounded-full px-3 py-1.5 text-xs ${
                    scheduleMins === Number(mins)
                      ? 'bg-white text-black'
                      : 'bg-white/8 text-white/80 hover:bg-white/12'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mb-4 text-sm text-white">
              📅 {scheduleAt.toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>

            <div className="mb-3 rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Threads 공식 API로 예약
              </p>
              <p className="mt-1 text-xs text-white/40">
                공식 API가 예약 시각에 발행해요. 브라우저나 노드를 켜둘 필요가 없어요.
              </p>
            </div>

            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              확장이 응답하지 않으면 크롬 확장 관리에서 하미를 새로고침한 뒤 다시 시도해 주세요.
            </div>

            <button
              type="button"
              disabled={saving || !selected}
              onClick={async () => {
                const ok = await persist('scheduled')
                if (ok) {
                  setMessage(`${scheduleAt.toLocaleString('ko-KR')}에 @${selected?.username} 계정으로 예약했습니다.`)
                  setScheduleOpen(false)
                }
              }}
              className="w-full rounded-xl bg-gold py-3 text-sm font-bold text-black disabled:opacity-50"
            >
              🗓️ (확장프로그램 방식) 이 시각에 예약하기
            </button>
            {!selected && (
              <p className="mt-2 text-xs text-gold">설정에서 업로드할 스레드 아이디를 먼저 연결하세요.</p>
            )}
          </div>
        </div>
      )}

      {importOpen ? (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onUseOriginal={() => {
            setMediaMode('original')
            setCustomMedia((prev) => {
              for (const item of prev) {
                if (item.url.startsWith('blob:')) URL.revokeObjectURL(item.url)
              }
              return []
            })
            setMessage('원문 영상·사진을 그대로 씁니다.')
          }}
          onAttach={attachFiles}
        />
      ) : null}

      {templateOpen ? (
        <TemplateModal onClose={() => setTemplateOpen(false)} onInsert={insertTemplate} />
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
            {thumb && <img src={thumb} alt="" className="mt-4 w-full rounded-xl object-cover" />}
          </div>
        </div>
      )}
    </div>
  )
}
