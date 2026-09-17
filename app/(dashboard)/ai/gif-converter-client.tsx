'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Download,
  Eye,
  Film,
  GripVertical,
  History,
  ImageIcon,
  LoaderCircle,
  Settings2,
  Trash2,
  Check,
} from 'lucide-react'
import { zipSync } from 'fflate'
import {
  convertImagesToGif,
  convertMediaToGif,
  formatBytes,
  gifFileName,
  isImageFile,
  isVideoFile,
} from '@/lib/gif-convert'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { GifHistoryPanel, type HistoryJob } from './gif-history-panel'

type JobKind = 'video' | 'image' | 'slideshow'
type JobStatus = 'queued' | 'running' | 'done' | 'error'

type StagedItem = {
  id: string
  file: File
  url: string
}

type JobResult = {
  blob: Blob
  url: string
  bytes: number
  width: number
  height: number
  frames: number
}

type Job = {
  id: string
  label: string
  files: File[]
  kind: JobKind
  status: JobStatus
  progress: number
  error?: string
  result?: JobResult
}

type GifSettings = {
  maxWidth: number
  maxColors: number
  startSec: number
  endSec: number
  fps: number
  speed: number
  imageHoldSec: number
}

const DEFAULT_SETTINGS: GifSettings = {
  maxWidth: 480,
  maxColors: 128,
  startSec: 0,
  endSec: 8,
  fps: 10,
  speed: 1,
  imageHoldSec: 0.8,
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

function formatTime(sec: number) {
  const s = Math.max(0, sec)
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${m}:${r.toFixed(1).padStart(4, '0')}`
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function makeItem(file: File): StagedItem {
  return { id: newId(), file, url: URL.createObjectURL(file) }
}

function revokeItems(list: StagedItem[]) {
  list.forEach((item) => URL.revokeObjectURL(item.url))
}

function revokeJobs(list: Job[]) {
  list.forEach((job) => {
    if (job.result?.url) URL.revokeObjectURL(job.result.url)
  })
}

function settingsKey(s: GifSettings, mergeImages: boolean, mode: string, itemIds: string[]) {
  return JSON.stringify({ s, mergeImages, mode, itemIds })
}

function NumberField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string
  hint?: string
  value: number
  onChange: (n: number) => void
  min: number
  max: number
  step: number
  suffix?: string
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-white/60">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (!Number.isFinite(n)) return
            onChange(Math.min(max, Math.max(min, n)))
          }}
          className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]/60"
        />
        {suffix ? <span className="shrink-0 text-xs text-white/40">{suffix}</span> : null}
      </div>
      {hint ? <p className="text-[11px] text-white/30">{hint}</p> : null}
    </label>
  )
}

async function persistJobToHistory(job: Job, settingsSnapshot: GifSettings) {
  if (!job.result) return
  try {
    const initRes = await fetch('/api/gif/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: job.kind,
        label: job.label,
        settings: settingsSnapshot,
        sources: job.files.map((f) => ({
          name: f.name,
          contentType: f.type || 'application/octet-stream',
          size: f.size,
        })),
        result: {
          bytes: job.result.bytes,
          width: job.result.width,
          height: job.result.height,
          frames: job.result.frames,
        },
      }),
    })
    const data = await initRes.json()
    if (!initRes.ok) throw new Error(data.error || 'history init failed')

    const supabase = createClient()
    for (let i = 0; i < job.files.length; i++) {
      const up = data.sourceUploads?.[i] as { path: string; token: string } | undefined
      if (!up) continue
      const { error } = await supabase.storage
        .from('gif-workspace')
        .uploadToSignedUrl(up.path, up.token, job.files[i], {
          contentType: job.files[i].type || 'application/octet-stream',
        })
      if (error) throw new Error(error.message)
    }

    const { error: gifErr } = await supabase.storage
      .from('gif-workspace')
      .uploadToSignedUrl(data.resultUpload.path, data.resultUpload.token, job.result.blob, {
        contentType: 'image/gif',
      })
    if (gifErr) throw new Error(gifErr.message)

    await fetch('/api/gif/history', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: data.job.id,
        status: 'done',
        resultBytes: job.result.bytes,
        width: job.result.width,
        height: job.result.height,
        frames: job.result.frames,
      }),
    })
  } catch (e) {
    console.error('[gif history]', e)
  }
}

export function GifConverterClient() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pageTab, setPageTab] = useState<'work' | 'history'>('work')
  const [mode, setMode] = useState<'video' | 'image'>('video')
  const [items, setItems] = useState<StagedItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mergeImages, setMergeImages] = useState(true)
  const [settings, setSettings] = useState<GifSettings>(DEFAULT_SETTINGS)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const [draggingFile, setDraggingFile] = useState(false)
  const [reorderId, setReorderId] = useState<string | null>(null)
  const orderDirtyRef = useRef(false)

  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')
  const [progress, setProgress] = useState(0)

  const [draftJobs, setDraftJobs] = useState<Job[]>([])
  const [draftKey, setDraftKey] = useState<string | null>(null)
  const [finalJobs, setFinalJobs] = useState<Job[]>([])

  const [videoDuration, setVideoDuration] = useState(0)
  const [stripFrames, setStripFrames] = useState<{ t: number; url: string }[]>([])
  const [stripLoading, setStripLoading] = useState(false)
  const [dragSelect, setDragSelect] = useState<{ a: number; b: number } | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const keepRangeRef = useRef(false)
  const rangeReadyRef = useRef(false)

  const rangeLen = Math.max(0.1, settings.endSec - settings.startSec)
  const activeItem = useMemo(
    () => items.find((i) => i.id === activeId) ?? items[0] ?? null,
    [items, activeId]
  )
  const currentKey = settingsKey(
    settings,
    mergeImages,
    mode,
    items.map((i) => i.id)
  )
  const draftFresh = Boolean(draftJobs.length && draftKey === currentKey)
  const draftStale = Boolean(draftJobs.length && draftKey !== currentKey)

  function patchSettings(patch: Partial<GifSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      if (next.endSec < next.startSec + 0.1) next.endSec = next.startSec + 0.1
      return next
    })
    clearDraft()
  }

  function clearStrip() {
    setStripFrames([])
    setStripLoading(false)
    setDragSelect(null)
    setVideoDuration(0)
  }

  function clearDraft() {
    setDraftJobs((prev) => {
      revokeJobs(prev)
      return []
    })
    setDraftKey(null)
  }

  function clearFinal() {
    setFinalJobs((prev) => {
      revokeJobs(prev)
      return []
    })
  }

  function clearAttachments() {
    setItems((prev) => {
      revokeItems(prev)
      return []
    })
    setActiveId(null)
    rangeReadyRef.current = false
    clearStrip()
    clearDraft()
  }

  async function buildFilmstrip(url: string, duration: number) {
    setStripLoading(true)
    setStripFrames([])
    try {
      const video = document.createElement('video')
      video.muted = true
      video.playsInline = true
      video.preload = 'auto'
      video.src = url
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('미리보기 실패'))
      })
      await video
        .play()
        .then(() => video.pause())
        .catch(() => undefined)

      const count = Math.min(48, Math.max(16, Math.ceil(duration * 2)))
      const thumbW = 72
      const scale = thumbW / Math.max(1, video.videoWidth)
      const thumbH = Math.max(40, Math.round(video.videoHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = thumbW
      canvas.height = thumbH
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const frames: { t: number; url: string }[] = []
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0 : (i / (count - 1)) * Math.max(0, duration - 0.05)
        await new Promise<void>((resolve, reject) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked)
            video.removeEventListener('error', onError)
            resolve()
          }
          const onError = () => {
            video.removeEventListener('seeked', onSeeked)
            video.removeEventListener('error', onError)
            reject(new Error('seek'))
          }
          video.addEventListener('seeked', onSeeked)
          video.addEventListener('error', onError)
          try {
            video.currentTime = t
          } catch (e) {
            video.removeEventListener('seeked', onSeeked)
            video.removeEventListener('error', onError)
            reject(e)
          }
        }).catch(() => undefined)
        ctx.fillStyle = '#111'
        ctx.fillRect(0, 0, thumbW, thumbH)
        ctx.drawImage(video, 0, 0, thumbW, thumbH)
        frames.push({ t: Number(t.toFixed(2)), url: canvas.toDataURL('image/jpeg', 0.7) })
        if (i % 4 === 3) await new Promise((r) => setTimeout(r, 0))
      }
      setStripFrames(frames)
      video.removeAttribute('src')
      video.load()
    } catch {
      setStripFrames([])
    } finally {
      setStripLoading(false)
    }
  }

  function applyStripSelection(a: number, b: number) {
    if (!stripFrames.length) return
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    const start = stripFrames[lo]?.t ?? 0
    const end = stripFrames[hi]?.t ?? start + 0.1
    patchSettings({
      startSec: start,
      endSec: Math.max(start + 0.1, end),
    })
    const v = previewVideoRef.current
    if (v) v.currentTime = start
  }

  function appendFiles(fileList: FileList | File[], opts?: { keepRange?: boolean; replace?: boolean }) {
    const media = [...fileList].filter((file) =>
      mode === 'video' ? isVideoFile(file) : isImageFile(file)
    )
    if (!media.length) return

    if (opts?.keepRange) keepRangeRef.current = true
    if (opts?.replace) rangeReadyRef.current = false
    const nextItems = media.map(makeItem)

    setItems((prev) => {
      if (opts?.replace) {
        revokeItems(prev)
        return nextItems
      }
      if (!prev.length) rangeReadyRef.current = false
      return [...prev, ...nextItems]
    })
    setActiveId((prev) => prev ?? nextItems[0]?.id ?? null)
    clearDraft()
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id)
      if (target) URL.revokeObjectURL(target.url)
      const next = prev.filter((i) => i.id !== id)
      setActiveId((cur) => {
        if (cur !== id) return cur
        return next[0]?.id ?? null
      })
      return next
    })
    clearDraft()
  }

  function reorderItems(fromId: string, toId: string) {
    if (fromId === toId) return
    setItems((prev) => {
      const from = prev.findIndex((i) => i.id === fromId)
      const to = prev.findIndex((i) => i.id === toId)
      if (from < 0 || to < 0 || from === to) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      orderDirtyRef.current = true
      return next
    })
  }

  function buildWorkUnits(): Omit<Job, 'status' | 'progress' | 'result' | 'error'>[] {
    const files = items.map((i) => i.file)
    if (!files.length) return []

    if (mode === 'video') {
      return files.map((file) => ({
        id: newId(),
        label: file.name,
        files: [file],
        kind: 'video' as const,
      }))
    }

    if (mergeImages && files.length >= 2) {
      return [
        {
          id: newId(),
          label: `이미지 ${files.length}장 슬라이드 GIF`,
          files,
          kind: 'slideshow' as const,
        },
      ]
    }

    return files.map((file) => ({
      id: newId(),
      label: file.name,
      files: [file],
      kind: 'image' as const,
    }))
  }

  async function runConvert(
    units: Omit<Job, 'status' | 'progress' | 'result' | 'error'>[],
    label: string
  ): Promise<Job[]> {
    setBusy(true)
    setBusyLabel(label)
    setProgress(0)
    const out: Job[] = []
    const s = settingsRef.current
    const durationSec = Math.max(0.1, s.endSec - s.startSec)

    try {
      for (let i = 0; i < units.length; i++) {
        const unit = units[i]
        const baseProgress = i / units.length
        const span = 1 / units.length
        try {
          const opts = {
            maxWidth: s.maxWidth,
            fps: s.fps,
            maxColors: s.maxColors,
            maxDurationSec: durationSec,
            startSec: s.startSec,
            speed: s.speed,
            imageDelay: Math.max(2, Math.round(s.imageHoldSec * 100)),
            onProgress: (ratio: number) => setProgress(baseProgress + ratio * span),
          }
          const result =
            unit.kind === 'slideshow'
              ? await convertImagesToGif(unit.files, opts)
              : await convertMediaToGif(unit.files[0], opts)
          const url = URL.createObjectURL(result.blob)
          out.push({
            ...unit,
            status: 'done',
            progress: 1,
            result: {
              blob: result.blob,
              url,
              bytes: result.bytes,
              width: result.width,
              height: result.height,
              frames: result.frames,
            },
          })
        } catch (error) {
          out.push({
            ...unit,
            status: 'error',
            progress: 0,
            error: error instanceof Error ? error.message : '변환 실패',
          })
        }
        setProgress((i + 1) / units.length)
      }
    } finally {
      setBusy(false)
      setBusyLabel('')
      setProgress(0)
    }
    return out
  }

  async function handlePreview() {
    if (!items.length || busy) return
    const keyAtStart = settingsKey(
      settingsRef.current,
      mergeImages,
      mode,
      items.map((i) => i.id)
    )
    clearDraft()
    clearFinal()
    const units = buildWorkUnits()
    const jobs = await runConvert(units, '미리보기 생성 중…')
    setDraftJobs(jobs)
    setDraftKey(keyAtStart)
  }

  async function handleFinalize() {
    if (!items.length || busy) return
    clearFinal()

    let jobs: Job[]
    if (draftFresh) {
      // Promote preview → final (same settings/order)
      jobs = draftJobs
        .filter((j) => j.status === 'done' && j.result)
        .map((j) => ({
          ...j,
          id: newId(),
          result: j.result
            ? {
                ...j.result,
                url: URL.createObjectURL(j.result.blob),
              }
            : undefined,
        }))
      setBusy(true)
      setBusyLabel('작업 기록 저장 중…')
      try {
        for (const job of jobs) {
          await persistJobToHistory(job, settingsRef.current)
        }
      } finally {
        setBusy(false)
        setBusyLabel('')
      }
    } else {
      const units = buildWorkUnits()
      jobs = await runConvert(units, '최종 GIF 생성 중…')
      setBusy(true)
      setBusyLabel('작업 기록 저장 중…')
      try {
        for (const job of jobs.filter((j) => j.status === 'done')) {
          await persistJobToHistory(job, settingsRef.current)
        }
      } finally {
        setBusy(false)
        setBusyLabel('')
      }
      clearDraft()
      setDraftJobs(jobs)
      setDraftKey(currentKey)
    }

    setFinalJobs(jobs)
  }

  function downloadOne(job: Job) {
    if (!job.result) return
    const a = document.createElement('a')
    a.href = job.result.url
    a.download =
      job.kind === 'slideshow' ? `slideshow-${Date.now()}.gif` : gifFileName(job.files[0].name)
    a.click()
  }

  function downloadMany(list: Job[]) {
    const done = list.filter((j) => j.status === 'done' && j.result)
    if (!done.length) return
    if (done.length === 1) {
      downloadOne(done[0])
      return
    }
    void (async () => {
      const payload: Record<string, Uint8Array> = {}
      for (let i = 0; i < done.length; i++) {
        const job = done[i]
        const buf = new Uint8Array(await job.result!.blob.arrayBuffer())
        let name =
          job.kind === 'slideshow' ? `slideshow-${i + 1}.gif` : gifFileName(job.files[0].name)
        if (payload[name]) name = `${i + 1}-${name}`
        payload[name] = buf
      }
      const zipped = zipSync(payload)
      const copy = new Uint8Array(zipped.byteLength)
      copy.set(zipped)
      const blob = new Blob([copy.buffer], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mostem-gifs-${Date.now()}.zip`
      a.click()
      URL.revokeObjectURL(url)
    })()
  }

  async function handleRework(historyJob: HistoryJob) {
    const res = await fetch(`/api/gif/history/${historyJob.id}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '기록 불러오기 실패')

    const raw = (data.job?.settings ?? historyJob.settings ?? {}) as Partial<GifSettings>
    const nextSettings: GifSettings = {
      ...DEFAULT_SETTINGS,
      maxWidth: typeof raw.maxWidth === 'number' ? raw.maxWidth : DEFAULT_SETTINGS.maxWidth,
      maxColors: typeof raw.maxColors === 'number' ? raw.maxColors : DEFAULT_SETTINGS.maxColors,
      startSec: typeof raw.startSec === 'number' ? raw.startSec : DEFAULT_SETTINGS.startSec,
      endSec: typeof raw.endSec === 'number' ? raw.endSec : DEFAULT_SETTINGS.endSec,
      fps: typeof raw.fps === 'number' ? raw.fps : DEFAULT_SETTINGS.fps,
      speed: typeof raw.speed === 'number' ? raw.speed : DEFAULT_SETTINGS.speed,
      imageHoldSec:
        typeof raw.imageHoldSec === 'number' ? raw.imageHoldSec : DEFAULT_SETTINGS.imageHoldSec,
    }
    setSettings(nextSettings)
    settingsRef.current = nextSettings

    const sources = (data.sourceUrls ?? historyJob.sourceUrls ?? []) as {
      name: string
      url: string
    }[]
    if (!sources.length) throw new Error('원본 파일이 없습니다')

    const files: File[] = []
    for (const src of sources) {
      const r = await fetch(src.url)
      if (!r.ok) throw new Error(`원본 다운로드 실패: ${src.name}`)
      const blob = await r.blob()
      files.push(new File([blob], src.name, { type: blob.type || 'application/octet-stream' }))
    }

    const kind = (data.job?.kind ?? historyJob.kind) as string
    setPageTab('work')
    clearFinal()
    clearDraft()

    if (kind === 'video') {
      setMode('video')
      appendFiles(files, { keepRange: true, replace: true })
      return
    }

    setMode('image')
    setMergeImages(kind === 'slideshow')
    appendFiles(files, { replace: true })
  }

  // Rebuild filmstrip when active video changes
  useEffect(() => {
    if (mode !== 'video' || !activeItem) {
      clearStrip()
    }
  }, [mode, activeItem?.id])

  const resultList = finalJobs.length ? finalJobs : draftJobs
  const showingFinal = finalJobs.length > 0 && !draftStale

  return (
    <div className="mx-auto w-full max-w-[920px]">
      <Link
        href="/ai"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 hover:text-white"
      >
        ← AI 도구
      </Link>

      <div className="mb-4">
        <h1 className="text-lg font-bold text-white">동영상/이미지 - GIF 변환</h1>
        <p className="mt-1 text-sm text-white/45">
          파일 업로드 → 미리보기 → 마음에 들면 최종 GIF 저장. 첨부는 항상 보이고 순서를 드래그로
          바꿀 수 있습니다.
        </p>
      </div>

      <div className="mb-4 flex gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        {(
          [
            { id: 'work' as const, label: '변환하기', icon: Film },
            { id: 'history' as const, label: '작업 기록', icon: History },
          ]
        ).map((tab) => {
          const Icon = tab.icon
          const active = pageTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPageTab(tab.id)}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                active
                  ? 'bg-white/12 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)]'
                  : 'text-white/50 hover:bg-white/5 hover:text-white/80'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {pageTab === 'history' ? (
        <GifHistoryPanel onRework={handleRework} />
      ) : (
        <>
          <div className="mb-5 flex gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
            {(
              [
                { id: 'video' as const, label: '동영상-gif', icon: Film },
                { id: 'image' as const, label: '이미지-gif', icon: ImageIcon },
              ]
            ).map((tab) => {
              const Icon = tab.icon
              const active = mode === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === mode) return
                    clearAttachments()
                    clearFinal()
                    setMode(tab.id)
                  }}
                  className={cn(
                    'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                    active
                      ? 'bg-[var(--accent)] text-white shadow-[0_0_0_1px_rgba(139,92,246,0.45)]'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {mode === 'image' ? (
            <div className="mb-3 space-y-1.5">
              <p className="text-xs text-white/50">
                이미지를 <span className="font-semibold text-white/75">여러 장</span> 올리면 기본으로{' '}
                <span className="font-semibold text-gold">하나의 슬라이드 GIF</span>를 만듭니다. 순서는
                첨부 칸에서 드래그로 바꿀 수 있습니다.
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-white/45">
                <input
                  type="checkbox"
                  checked={!mergeImages}
                  onChange={(e) => {
                    setMergeImages(!e.target.checked)
                    clearDraft()
                  }}
                  className="rounded border-white/20 bg-black/40"
                />
                이미지마다 따로 GIF 만들기 (1장=1GIF)
              </label>
            </div>
          ) : null}

          {/* Upload + attachments (above settings) */}
          <div
            className={cn(
              'mb-4 rounded-2xl border border-dashed transition',
              draggingFile
                ? 'border-gold bg-gold/10'
                : 'border-white/15 bg-white/[0.03]'
            )}
            onDragEnter={(e) => {
              e.preventDefault()
              if (!reorderId) setDraggingFile(true)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              if (!reorderId) setDraggingFile(true)
            }}
            onDragLeave={() => setDraggingFile(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDraggingFile(false)
              if (reorderId) return
              if (!e.dataTransfer.files?.length) return
              appendFiles(e.dataTransfer.files)
            }}
          >
            {items.length === 0 ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center px-4 py-10 text-center hover:bg-white/[0.02]"
              >
                <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                  {mode === 'video' ? <Film className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                </span>
                <p className="text-sm font-semibold text-white">
                  {mode === 'video' ? '동영상 끌어다 놓거나 클릭' : '이미지 끌어다 놓거나 클릭'}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  올린 파일은 이 칸에 그대로 표시됩니다. GIF는 미리보기 후 최종 저장합니다.
                </p>
                <p className="mt-2 text-[11px] text-white/30">
                  {mode === 'video' ? 'MP4 · WEBM · MOV' : 'PNG · JPG · WEBP · BMP'}
                </p>
              </button>
            ) : (
              <div className="p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-white/70">
                    첨부 {items.length}개 · 드래그로 순서 변경
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/15"
                    >
                      + 파일 추가
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearAttachments()
                        clearFinal()
                      }}
                      className="text-[11px] text-white/40 hover:text-white/70"
                    >
                      전부 제거
                    </button>
                  </div>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {items.map((item, index) => {
                    const isActive = activeItem?.id === item.id
                    const isVideo = isVideoFile(item.file)
                    return (
                      <li
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation()
                          setReorderId(item.id)
                          orderDirtyRef.current = false
                          setDraggingFile(false)
                        }}
                        onDragEnd={() => {
                          setReorderId(null)
                          if (orderDirtyRef.current) {
                            orderDirtyRef.current = false
                            clearDraft()
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (reorderId && reorderId !== item.id) reorderItems(reorderId, item.id)
                        }}
                        onClick={() => setActiveId(item.id)}
                        className={cn(
                          'flex cursor-grab items-center gap-2 rounded-xl border bg-black/30 p-2 active:cursor-grabbing',
                          isActive ? 'border-[var(--accent)]' : 'border-white/10',
                          reorderId === item.id && 'opacity-50'
                        )}
                      >
                        <GripVertical className="h-4 w-4 shrink-0 text-white/30" />
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold text-white/60">
                          {index + 1}
                        </span>
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-black/50">
                          {isVideo ? (
                            <video
                              src={item.url}
                              muted
                              playsInline
                              preload="metadata"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.url} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-white">{item.file.name}</p>
                          <p className="text-[10px] text-white/35">{formatBytes(item.file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeItem(item.id)
                          }}
                          className="rounded-md p-1 text-white/30 hover:bg-white/10 hover:text-white"
                          aria-label="제거"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-2 text-[11px] text-white/30">
                  파일을 이 칸에 더 끌어다 놓아도 추가됩니다.
                </p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={
                mode === 'video'
                  ? 'video/*,.mp4,.webm,.mov,.m4v'
                  : 'image/*,.png,.jpg,.jpeg,.webp,.bmp'
              }
              multiple
              className="hidden"
              onChange={(e) => {
                if (!e.target.files?.length) return
                appendFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>

          <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-white/85">
                <Settings2 className="h-4 w-4 text-[var(--accent)]" />
                세부 설정 · {mode === 'video' ? '동영상' : '이미지'}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSettings(DEFAULT_SETTINGS)
                  clearDraft()
                }}
                className="text-[11px] text-white/40 hover:text-white/70"
              >
                기본값으로
              </button>
            </div>

            {mode === 'video' ? (
              <div className="space-y-4">
                {!activeItem ? (
                  <p className="text-xs text-white/40">
                    위에서 영상을 올리면 프레임이 펼쳐집니다. 구간을 고른 뒤 미리보세요.
                  </p>
                ) : null}

                {activeItem ? (
                  <div className="space-y-3">
                    <video
                      key={activeItem.id}
                      ref={previewVideoRef}
                      src={activeItem.url}
                      className="max-h-[240px] w-full rounded-xl bg-black object-contain"
                      controls
                      muted
                      playsInline
                      onLoadedMetadata={(e) => {
                        const d = e.currentTarget.duration
                        if (!Number.isFinite(d) || d <= 0) return
                        setVideoDuration(d)
                        setSettings((prev) => {
                          const clamp = () => {
                            const start = Math.min(
                              Math.max(0, prev.startSec),
                              Math.max(0, d - 0.1)
                            )
                            const end = Math.min(d, Math.max(start + 0.1, prev.endSec))
                            return { ...prev, startSec: start, endSec: end }
                          }
                          if (keepRangeRef.current) {
                            keepRangeRef.current = false
                            rangeReadyRef.current = true
                            return clamp()
                          }
                          if (rangeReadyRef.current) return clamp()
                          rangeReadyRef.current = true
                          return {
                            ...prev,
                            startSec: 0,
                            endSec: Math.min(d, Math.max(3, Math.min(8, d))),
                          }
                        })
                        void buildFilmstrip(activeItem.url, d)
                      }}
                    />
                    <p className="text-[11px] text-white/40">
                      {items.length > 1
                        ? `${items.length}개 영상 · 구간은 동일 적용 · ${activeItem.file.name}`
                        : activeItem.file.name}
                      {videoDuration > 0 ? ` · 전체 ${formatTime(videoDuration)}` : ''}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-white/70">
                          전체 프레임 · 드래그로 구간 선택
                        </p>
                        {stripLoading ? (
                          <span className="flex items-center gap-1 text-[11px] text-white/40">
                            <LoaderCircle className="h-3 w-3 animate-spin" /> 프레임 불러오는 중…
                          </span>
                        ) : null}
                      </div>

                      {stripFrames.length > 0 ? (
                        <div
                          className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-2 [scrollbar-width:thin]"
                          onMouseLeave={() => {
                            if (dragSelect) {
                              applyStripSelection(dragSelect.a, dragSelect.b)
                              setDragSelect(null)
                            }
                          }}
                          onMouseUp={() => {
                            if (dragSelect) {
                              applyStripSelection(dragSelect.a, dragSelect.b)
                              setDragSelect(null)
                            }
                          }}
                        >
                          <div className="flex w-max gap-1">
                            {stripFrames.map((frame, idx) => {
                              const selA = dragSelect ? Math.min(dragSelect.a, dragSelect.b) : null
                              const selB = dragSelect ? Math.max(dragSelect.a, dragSelect.b) : null
                              const inDrag =
                                selA != null && selB != null && idx >= selA && idx <= selB
                              const inRange =
                                frame.t >= settings.startSec - 0.01 &&
                                frame.t <= settings.endSec + 0.01
                              const active = inDrag || (!dragSelect && inRange)
                              const isStart =
                                !dragSelect && Math.abs(frame.t - settings.startSec) < 0.08
                              const isEnd =
                                !dragSelect && Math.abs(frame.t - settings.endSec) < 0.08
                              return (
                                <button
                                  key={`${frame.t}-${idx}`}
                                  type="button"
                                  title={`${formatTime(frame.t)}`}
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    setDragSelect({ a: idx, b: idx })
                                  }}
                                  onMouseEnter={() => {
                                    if (dragSelect) setDragSelect((d) => (d ? { ...d, b: idx } : d))
                                  }}
                                  onClick={() => {
                                    const v = previewVideoRef.current
                                    if (v) v.currentTime = frame.t
                                  }}
                                  className={cn(
                                    'relative shrink-0 overflow-hidden rounded-md border-2 transition',
                                    active
                                      ? 'border-[var(--accent)] opacity-100'
                                      : 'border-transparent opacity-45 hover:opacity-80',
                                    isStart && 'ring-2 ring-[var(--gold)]',
                                    isEnd && 'ring-2 ring-emerald-400'
                                  )}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={frame.url}
                                    alt=""
                                    className="h-[64px] w-[72px] object-cover"
                                    draggable={false}
                                  />
                                  <span className="absolute bottom-0 left-0 right-0 bg-black/70 px-0.5 text-center text-[9px] text-white/80">
                                    {formatTime(frame.t)}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : !stripLoading ? (
                        <p className="text-xs text-white/35">
                          프레임을 불러오지 못했어요. 영상을 다시 올려 주세요.
                        </p>
                      ) : null}

                      <p className="text-[11px] text-white/35">
                        노란 테두리 = 시작 · 초록 = 끝 · 프레임을 드래그해서 구간을 정하세요
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField
                    label="시작 (초)"
                    value={Number(settings.startSec.toFixed(1))}
                    onChange={(n) => {
                      patchSettings({ startSec: n })
                      clearDraft()
                      const v = previewVideoRef.current
                      if (v) v.currentTime = n
                    }}
                    min={0}
                    max={videoDuration > 0 ? videoDuration : 600}
                    step={0.1}
                    suffix="초"
                  />
                  <NumberField
                    label="끝 (초)"
                    value={Number(settings.endSec.toFixed(1))}
                    onChange={(n) => {
                      patchSettings({ endSec: n })
                      clearDraft()
                    }}
                    min={0.1}
                    max={videoDuration > 0 ? videoDuration : 600}
                    step={0.1}
                    suffix="초"
                  />
                </div>

                {videoDuration > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const v = previewVideoRef.current
                        if (!v) return
                        patchSettings({ startSec: Number(v.currentTime.toFixed(1)) })
                        clearDraft()
                      }}
                      className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] text-white/70 hover:bg-white/15"
                    >
                      재생위치를 시작으로
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const v = previewVideoRef.current
                        if (!v) return
                        patchSettings({ endSec: Number(v.currentTime.toFixed(1)) })
                        clearDraft()
                      }}
                      className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] text-white/70 hover:bg-white/15"
                    >
                      재생위치를 끝으로
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const v = previewVideoRef.current
                        if (!v) return
                        v.currentTime = settings.startSec
                        void v.play()
                        const stopAt = settings.endSec
                        const onTime = () => {
                          if (v.currentTime >= stopAt) {
                            v.pause()
                            v.removeEventListener('timeupdate', onTime)
                          }
                        }
                        v.addEventListener('timeupdate', onTime)
                      }}
                      className="rounded-lg bg-[var(--accent)]/80 px-2.5 py-1 text-[11px] text-white hover:bg-[var(--accent)]"
                    >
                      선택 구간 재생
                    </button>
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-white/60">재생 속도</span>
                  <div className="flex flex-wrap gap-1.5">
                    {SPEED_OPTIONS.map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => {
                          patchSettings({ speed: sp })
                          clearDraft()
                        }}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs font-semibold',
                          settings.speed === sp
                            ? 'bg-[var(--gold)] text-black'
                            : 'bg-white/5 text-white/55 hover:bg-white/10'
                        )}
                      >
                        {sp}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField
                    label="프레임 밀도 (FPS)"
                    hint="클수록 부드럽고 용량↑"
                    value={settings.fps}
                    onChange={(n) => {
                      patchSettings({ fps: n })
                      clearDraft()
                    }}
                    min={4}
                    max={20}
                    step={1}
                    suffix="fps"
                  />
                  <NumberField
                    label="가로 크기"
                    value={settings.maxWidth}
                    onChange={(n) => {
                      patchSettings({ maxWidth: n })
                      clearDraft()
                    }}
                    min={240}
                    max={720}
                    step={40}
                    suffix="px"
                  />
                  <NumberField
                    label="색상 수"
                    value={settings.maxColors}
                    onChange={(n) => {
                      patchSettings({ maxColors: n })
                      clearDraft()
                    }}
                    min={32}
                    max={256}
                    step={16}
                    suffix="색"
                  />
                </div>

                <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-[11px] leading-relaxed text-white/40">
                  선택{' '}
                  <span className="font-semibold text-white/70">
                    {formatTime(settings.startSec)} ~ {formatTime(settings.endSec)}
                  </span>
                  {' · '}
                  {rangeLen.toFixed(1)}초 · 약 {Math.floor(rangeLen * settings.fps)}프레임 ·{' '}
                  {settings.speed}x
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField
                  label="장당 유지 시간"
                  hint="슬라이드에서 한 이미지가 보이는 시간"
                  value={settings.imageHoldSec}
                  onChange={(n) => {
                    patchSettings({ imageHoldSec: n })
                    clearDraft()
                  }}
                  min={0.2}
                  max={5}
                  step={0.1}
                  suffix="초"
                />
                <NumberField
                  label="가로 크기"
                  hint="긴 쪽 기준 최대 가로 픽셀"
                  value={settings.maxWidth}
                  onChange={(n) => {
                    patchSettings({ maxWidth: n })
                    clearDraft()
                  }}
                  min={240}
                  max={1080}
                  step={40}
                  suffix="px"
                />
                <NumberField
                  label="색상 수"
                  hint="적을수록 용량↓ · 권장 64~128"
                  value={settings.maxColors}
                  onChange={(n) => {
                    patchSettings({ maxColors: n })
                    clearDraft()
                  }}
                  min={32}
                  max={256}
                  step={16}
                  suffix="색"
                />
                <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-[11px] leading-relaxed text-white/40">
                  첨부 {items.length || 0}장 × {settings.imageHoldSec}초
                  {mergeImages && items.length >= 2
                    ? ` = 약 ${(items.length * settings.imageHoldSec).toFixed(1)}초 슬라이드`
                    : ''}
                </div>
              </div>
            )}
          </div>

          {/* Preview / Final actions */}
          {items.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || (mode === 'video' && stripLoading)}
                onClick={() => void handlePreview()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/12 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/16 disabled:opacity-40"
              >
                {busy && busyLabel.includes('미리보기') ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                미리보기
              </button>
              <button
                type="button"
                disabled={busy || !draftFresh}
                onClick={() => void handleFinalize()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                title={!draftFresh ? '먼저 미리보기로 결과를 확인하세요' : undefined}
              >
                {busy && (busyLabel.includes('최종') || busyLabel.includes('저장')) ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                최종 GIF 만들기
              </button>
              {draftStale ? (
                <p className="w-full text-[11px] text-amber-300/80">
                  설정·순서·첨부가 바뀌었습니다. 미리보기를 다시 해주세요.
                </p>
              ) : !draftFresh && !busy ? (
                <p className="w-full text-[11px] text-white/35">
                  먼저 <span className="text-white/60">미리보기</span>로 확인하고, 마음에 들면{' '}
                  <span className="text-white/60">최종 GIF 만들기</span>를 누르세요.
                </p>
              ) : null}
            </div>
          ) : null}

          {busy ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/50">
                <span className="flex items-center gap-1.5">
                  <LoaderCircle className="h-3 w-3 animate-spin" />
                  {busyLabel || '작업 중…'}
                </span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gold transition-[width]"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
          ) : null}

          {resultList.length > 0 ? (
            <div className="mt-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-white/45">
                  {showingFinal ? '최종 결과' : '미리보기'} ·{' '}
                  {resultList.filter((j) => j.status === 'done').length}/{resultList.length}
                  {draftStale && !showingFinal ? ' · (설정 변경됨)' : ''}
                </p>
                <div className="flex items-center gap-2">
                  {showingFinal ? (
                    <button
                      type="button"
                      onClick={() => downloadMany(finalJobs)}
                      disabled={!finalJobs.some((j) => j.status === 'done')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      <Download className="h-3.5 w-3.5" />
                      다운로드
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      clearDraft()
                      clearFinal()
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    결과 비우기
                  </button>
                </div>
              </div>

              <ul className="space-y-2">
                {resultList.map((job) => (
                  <li key={job.id} className="rounded-xl border border-white/10 bg-[var(--card-bg)] p-3">
                    <div className="flex items-start gap-3">
                      <div className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-visible rounded-lg bg-black/40">
                        {job.result?.url ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={job.result.url}
                              alt=""
                              className="h-20 w-20 rounded-lg object-cover"
                            />
                            <div className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-[260px] rounded-xl border border-white/15 bg-black/95 p-1.5 shadow-2xl group-hover:block">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={job.result.url}
                                alt=""
                                className="max-h-[360px] w-full rounded-lg object-contain"
                              />
                            </div>
                          </>
                        ) : job.kind === 'video' ? (
                          <Film className="h-5 w-5 text-white/35" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-white/35" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{job.label}</p>
                        <p className="mt-0.5 text-[11px] text-white/40">
                          {job.kind === 'slideshow'
                            ? `${job.files.length}장`
                            : `원본 ${formatBytes(job.files[0].size)}`}
                          {job.result
                            ? ` → GIF ${formatBytes(job.result.bytes)} · ${job.result.width}×${job.result.height} · ${job.result.frames}프레임`
                            : null}
                        </p>
                        {job.status === 'error' ? (
                          <p className="mt-2 text-[11px] text-red-400">{job.error}</p>
                        ) : null}
                        {job.status === 'done' && showingFinal ? (
                          <button
                            type="button"
                            onClick={() => downloadOne(job)}
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-gold hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            GIF 저장
                          </button>
                        ) : null}
                        {job.status === 'done' && !showingFinal ? (
                          <p className="mt-2 text-[11px] text-white/40">
                            미리보기입니다. 마음에 들면 위에서 최종 GIF를 만드세요.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Keep attachments visible reminder under results */}
              {items.length > 0 ? (
                <p className="text-[11px] text-white/30">
                  첨부 파일은 위에 그대로 남아 있습니다. 순서·설정을 바꾼 뒤 다시 미리볼 수 있습니다.
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
