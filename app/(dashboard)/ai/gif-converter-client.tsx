'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Download, Film, ImageIcon, LoaderCircle, Settings2, Trash2 } from 'lucide-react'
import { zipSync } from 'fflate'
import {
  convertImagesToGif,
  convertMediaToGif,
  formatBytes,
  gifFileName,
  isImageFile,
  isVideoFile,
} from '@/lib/gif-convert'
import { cn } from '@/lib/utils'

type JobStatus = 'queued' | 'running' | 'done' | 'error'

type Job = {
  id: string
  label: string
  files: File[]
  kind: 'video' | 'image' | 'slideshow'
  status: JobStatus
  progress: number
  error?: string
  result?: {
    blob: Blob
    url: string
    bytes: number
    width: number
    height: number
    frames: number
  }
}

type GifSettings = {
  maxWidth: number
  maxColors: number
  /** video: range start */
  startSec: number
  /** video: range end */
  endSec: number
  /** video: frames per second sampling */
  fps: number
  /** video: output playback speed */
  speed: number
  /** image slideshow: seconds each frame is shown */
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

export function GifConverterClient() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'video' | 'image'>('video')
  const [jobs, setJobs] = useState<Job[]>([])
  const jobsRef = useRef<Job[]>([])
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [mergeImages, setMergeImages] = useState(true)
  const [settings, setSettings] = useState<GifSettings>(DEFAULT_SETTINGS)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const runningRef = useRef(false)
  const [stagedVideos, setStagedVideos] = useState<File[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const previewVideoRef = useRef<HTMLVideoElement>(null)

  const rangeLen = Math.max(0.1, settings.endSec - settings.startSec)

  function patchSettings(patch: Partial<GifSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      if (next.endSec < next.startSec + 0.1) next.endSec = next.startSec + 0.1
      return next
    })
  }

  function clearPreview() {
    setStagedVideos([])
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setVideoDuration(0)
  }

  function stageVideos(files: File[]) {
    const videos = files.filter(isVideoFile)
    if (!videos.length) return
    setStagedVideos(videos)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(videos[0])
    })
  }

  const syncJobs = useCallback((updater: (prev: Job[]) => Job[]) => {
    setJobs((prev) => {
      const next = updater(prev)
      jobsRef.current = next
      return next
    })
  }, [])

  const visibleJobs = useMemo(
    () =>
      jobs.filter((job) =>
        mode === 'video' ? job.kind === 'video' : job.kind === 'image' || job.kind === 'slideshow'
      ),
    [jobs, mode]
  )
  const visibleDone = useMemo(
    () => visibleJobs.filter((j) => j.status === 'done').length,
    [visibleJobs]
  )
  const visibleBytes = useMemo(
    () => visibleJobs.reduce((sum, j) => sum + (j.result?.bytes ?? 0), 0),
    [visibleJobs]
  )

  const patchJob = useCallback(
    (id: string, patch: Partial<Job>) => {
      syncJobs((prev) => prev.map((job) => (job.id === id ? { ...job, ...patch } : job)))
    },
    [syncJobs]
  )

  const pump = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true
    setBusy(true)
    const CONCURRENCY = 3
    try {
      while (true) {
        const queued = jobsRef.current.filter((job) => job.status === 'queued').slice(0, CONCURRENCY)
        if (!queued.length) break

        await Promise.all(
          queued.map(async (next) => {
            patchJob(next.id, { status: 'running', progress: 0, error: undefined })
            try {
              const s = settingsRef.current
              const durationSec = Math.max(0.1, s.endSec - s.startSec)
              const opts = {
                maxWidth: s.maxWidth,
                fps: s.fps,
                maxColors: s.maxColors,
                maxDurationSec: durationSec,
                startSec: s.startSec,
                speed: s.speed,
                imageDelay: Math.max(2, Math.round(s.imageHoldSec * 100)),
                onProgress: (ratio: number) => patchJob(next.id, { progress: ratio }),
              }
              const result =
                next.kind === 'slideshow'
                  ? await convertImagesToGif(next.files, opts)
                  : await convertMediaToGif(next.files[0], opts)
              const url = URL.createObjectURL(result.blob)
              patchJob(next.id, {
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
              patchJob(next.id, {
                status: 'error',
                progress: 0,
                error: error instanceof Error ? error.message : '변환 실패',
              })
            }
          })
        )
      }
    } finally {
      runningRef.current = false
      setBusy(false)
    }
  }, [patchJob])

  const addFiles = useCallback(
    (fileList: FileList | File[], asSlideshow = mergeImages) => {
      const media = [...fileList].filter((file) =>
        mode === 'video' ? isVideoFile(file) : isImageFile(file)
      )
      if (!media.length) return

      const videos = media.filter(isVideoFile)
      const images = media
        .filter(isImageFile)
        .sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }))
      const next: Job[] = []

      videos.forEach((file) => {
        next.push({
          id: newId(),
          label: file.name,
          files: [file],
          kind: 'video',
          status: 'queued',
          progress: 0,
        })
      })

      // Image tab: 2+ files → one slideshow GIF by default (unless opt-out)
      if (mode === 'image' && asSlideshow && images.length >= 2) {
        next.push({
          id: newId(),
          label: `이미지 ${images.length}장 슬라이드 GIF`,
          files: images,
          kind: 'slideshow',
          status: 'queued',
          progress: 0,
        })
      } else {
        images.forEach((file) => {
          next.push({
            id: newId(),
            label: file.name,
            files: [file],
            kind: 'image',
            status: 'queued',
            progress: 0,
          })
        })
      }

      if (!next.length) return
      syncJobs((prev) => [...prev, ...next])
      queueMicrotask(() => void pump())
    },
    [mergeImages, mode, pump, syncJobs]
  )

  function clearAll() {
    syncJobs((prev) => {
      prev.forEach((job) => {
        if (job.result?.url) URL.revokeObjectURL(job.result.url)
      })
      return []
    })
  }

  function removeJob(id: string) {
    syncJobs((prev) => {
      const target = prev.find((j) => j.id === id)
      if (target?.result?.url) URL.revokeObjectURL(target.result.url)
      return prev.filter((j) => j.id !== id)
    })
  }

  function downloadOne(job: Job) {
    if (!job.result) return
    const a = document.createElement('a')
    a.href = job.result.url
    a.download =
      job.kind === 'slideshow' ? `slideshow-${Date.now()}.gif` : gifFileName(job.files[0].name)
    a.click()
  }

  function downloadAll() {
    const done = visibleJobs.filter((j) => j.status === 'done' && j.result)
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
          서버 업로드 없이 브라우저에서만 GIF로 바꿉니다.
        </p>
      </div>

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
                setMode(tab.id)
                if (tab.id !== 'video') clearPreview()
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
            <span className="font-semibold text-gold">하나의 슬라이드 GIF</span>를 만듭니다.
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/45">
            <input
              type="checkbox"
              checked={!mergeImages}
              onChange={(e) => setMergeImages(!e.target.checked)}
              className="rounded border-white/20 bg-black/40"
            />
            이미지마다 따로 GIF 만들기 (1장=1GIF)
          </label>
        </div>
      ) : null}

      <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-white/85">
            <Settings2 className="h-4 w-4 text-[var(--accent)]" />
            세부 설정 · {mode === 'video' ? '동영상' : '이미지'}
          </div>
          <button
            type="button"
            onClick={() => setSettings(DEFAULT_SETTINGS)}
            className="text-[11px] text-white/40 hover:text-white/70"
          >
            기본값으로
          </button>
        </div>

        {mode === 'video' ? (
          <div className="space-y-4">
            {previewUrl ? (
              <div className="space-y-3">
                <video
                  ref={previewVideoRef}
                  src={previewUrl}
                  className="max-h-[280px] w-full rounded-xl bg-black object-contain"
                  controls
                  muted
                  playsInline
                  onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration
                    if (!Number.isFinite(d) || d <= 0) return
                    setVideoDuration(d)
                    setSettings((prev) => ({
                      ...prev,
                      startSec: Math.min(prev.startSec, Math.max(0, d - 0.5)),
                      endSec: Math.min(Math.max(prev.endSec, prev.startSec + 0.5), d),
                    }))
                  }}
                />
                <p className="text-[11px] text-white/40">
                  {stagedVideos.length > 1
                    ? `${stagedVideos.length}개 영상 · 구간 설정은 전체에 동일 적용 · 미리보기: ${stagedVideos[0]?.name}`
                    : stagedVideos[0]?.name}
                  {videoDuration > 0 ? ` · 전체 ${formatTime(videoDuration)}` : ''}
                </p>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                label="시작 (초)"
                hint="원하는 장면이 시작하는 시점"
                value={Number(settings.startSec.toFixed(1))}
                onChange={(n) => {
                  patchSettings({ startSec: n })
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
                hint="원하는 장면이 끝나는 시점"
                value={Number(settings.endSec.toFixed(1))}
                onChange={(n) => patchSettings({ endSec: n })}
                min={0.1}
                max={videoDuration > 0 ? videoDuration : 600}
                step={0.1}
                suffix="초"
              />
            </div>

            {videoDuration > 0 ? (
              <div className="space-y-2">
                <label className="block space-y-1">
                  <span className="text-xs text-white/55">시작 슬라이더</span>
                  <input
                    type="range"
                    min={0}
                    max={videoDuration}
                    step={0.1}
                    value={settings.startSec}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      patchSettings({ startSec: n })
                      const v = previewVideoRef.current
                      if (v) v.currentTime = n
                    }}
                    className="w-full accent-[var(--accent)]"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-white/55">끝 슬라이더</span>
                  <input
                    type="range"
                    min={0}
                    max={videoDuration}
                    step={0.1}
                    value={settings.endSec}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      patchSettings({ endSec: n })
                      const v = previewVideoRef.current
                      if (v) v.currentTime = n
                    }}
                    className="w-full accent-[var(--gold)]"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const v = previewVideoRef.current
                      if (!v) return
                      patchSettings({ startSec: Number(v.currentTime.toFixed(1)) })
                    }}
                    className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] text-white/70 hover:bg-white/15"
                  >
                    현재 위치를 시작으로
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const v = previewVideoRef.current
                      if (!v) return
                      patchSettings({ endSec: Number(v.currentTime.toFixed(1)) })
                    }}
                    className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] text-white/70 hover:bg-white/15"
                  >
                    현재 위치를 끝으로
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
                    선택 구간 미리듣기
                  </button>
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-white/60">재생 속도</span>
              <div className="flex flex-wrap gap-1.5">
                {SPEED_OPTIONS.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => patchSettings({ speed: sp })}
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
              <p className="text-[11px] text-white/30">2x면 GIF가 원본보다 두 배 빠르게 재생됩니다</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                label="프레임 밀도 (FPS)"
                hint="클수록 부드럽고 용량↑ · 권장 8~12"
                value={settings.fps}
                onChange={(n) => patchSettings({ fps: n })}
                min={4}
                max={20}
                step={1}
                suffix="fps"
              />
              <NumberField
                label="가로 크기"
                value={settings.maxWidth}
                onChange={(n) => patchSettings({ maxWidth: n })}
                min={240}
                max={720}
                step={40}
                suffix="px"
              />
              <NumberField
                label="색상 수"
                hint="적을수록 용량↓"
                value={settings.maxColors}
                onChange={(n) => patchSettings({ maxColors: n })}
                min={32}
                max={256}
                step={16}
                suffix="색"
              />
            </div>

            <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-[11px] leading-relaxed text-white/40">
              선택 구간{' '}
              <span className="font-semibold text-white/70">
                {formatTime(settings.startSec)} ~ {formatTime(settings.endSec)}
              </span>
              {' · '}
              길이 <span className="font-semibold text-white/70">{rangeLen.toFixed(1)}초</span>
              {' · '}
              약{' '}
              <span className="font-semibold text-white/70">
                {Math.floor(rangeLen * settings.fps)}프레임
              </span>
              {' · '}
              재생속도 <span className="font-semibold text-white/70">{settings.speed}x</span>
              {' → '}
              GIF 재생 약{' '}
              <span className="font-semibold text-white/70">
                {(rangeLen / settings.speed).toFixed(1)}초
              </span>
            </div>

            {stagedVideos.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    addFiles(stagedVideos)
                    clearPreview()
                  }}
                  className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  선택 구간으로 GIF 만들기
                  {stagedVideos.length > 1 ? ` (${stagedVideos.length}개)` : ''}
                </button>
                <button
                  type="button"
                  onClick={clearPreview}
                  className="rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white/70"
                >
                  취소
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label="장당 유지 시간"
              hint="슬라이드에서 한 이미지가 보이는 시간"
              value={settings.imageHoldSec}
              onChange={(n) => patchSettings({ imageHoldSec: n })}
              min={0.2}
              max={5}
              step={0.1}
              suffix="초"
            />
            <NumberField
              label="가로 크기"
              hint="긴 쪽 기준 최대 가로 픽셀"
              value={settings.maxWidth}
              onChange={(n) => patchSettings({ maxWidth: n })}
              min={240}
              max={1080}
              step={40}
              suffix="px"
            />
            <NumberField
              label="색상 수"
              hint="적을수록 용량↓ · 권장 64~128"
              value={settings.maxColors}
              onChange={(n) => patchSettings({ maxColors: n })}
              min={32}
              max={256}
              step={16}
              suffix="색"
            />
            <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-[11px] leading-relaxed text-white/40">
              예: 이미지 10장 × {settings.imageHoldSec}초 = 약{' '}
              <span className="font-semibold text-white/70">
                {(10 * settings.imageHoldSec).toFixed(1)}초
              </span>{' '}
              길이 GIF
            </div>
          </div>
        )}
      </div>

      <div
        onDragEnter={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!e.dataTransfer.files?.length) return
          if (mode === 'video') stageVideos([...e.dataTransfer.files])
          else addFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'cursor-pointer rounded-2xl border border-dashed px-4 py-10 text-center transition',
          dragging
            ? 'border-gold bg-gold/10'
            : 'border-white/15 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]'
        )}
      >
        <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold">
          {mode === 'video' ? <Film className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
        </span>
        <p className="text-sm font-semibold text-white">
          {mode === 'video' ? '동영상 끌어다 놓거나 클릭' : '이미지 끌어다 놓거나 클릭'}
        </p>
        <p className="mt-1 text-xs text-white/40">
          {mode === 'video'
            ? '올린 뒤 아래에서 원하는 구간·속도를 고르세요'
            : 'PNG · JPG · WEBP · BMP'}
        </p>
        <p className="mt-3 text-[11px] text-white/30">
          {mode === 'video'
            ? `${formatTime(settings.startSec)}~${formatTime(settings.endSec)} · ${settings.speed}x · ${settings.fps}fps · ${settings.maxWidth}px`
            : `장당 ${settings.imageHoldSec}초 · ${settings.maxWidth}px · ${settings.maxColors}색`}
        </p>
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
            if (mode === 'video') stageVideos([...e.target.files])
            else addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {visibleJobs.length > 0 ? (
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-white/45">
              {visibleDone}/{visibleJobs.length} 완료
              {visibleBytes > 0 ? ` · 합계 ${formatBytes(visibleBytes)}` : ''}
              {busy ? ' · 변환 중…' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadAll}
                disabled={visibleDone === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                {visibleDone > 1 ? 'ZIP 다운로드' : '다운로드'}
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                비우기
              </button>
            </div>
          </div>

          <ul className="space-y-2">
            {visibleJobs.map((job) => (
              <li key={job.id} className="rounded-xl border border-white/10 bg-[var(--card-bg)] p-3">
                <div className="flex items-start gap-3">
                  <div className="group relative flex h-14 w-14 shrink-0 items-center justify-center overflow-visible rounded-lg bg-black/40">
                    {job.result?.url ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={job.result.url}
                          alt=""
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                        <div className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-[220px] rounded-xl border border-white/15 bg-black/95 p-1.5 shadow-2xl group-hover:block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={job.result.url}
                            alt=""
                            className="max-h-[320px] w-full rounded-lg object-contain"
                          />
                        </div>
                      </>
                    ) : job.kind === 'image' || job.kind === 'slideshow' ? (
                      <ImageIcon className="h-5 w-5 text-white/35" />
                    ) : (
                      <Film className="h-5 w-5 text-white/35" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{job.label}</p>
                        <p className="mt-0.5 text-[11px] text-white/40">
                          {job.kind === 'slideshow'
                            ? `${job.files.length}장`
                            : `원본 ${formatBytes(job.files[0].size)}`}
                          {job.result
                            ? ` → GIF ${formatBytes(job.result.bytes)} · ${job.result.width}×${job.result.height} · ${job.result.frames}프레임`
                            : null}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeJob(job.id)}
                        className="rounded-md p-1 text-white/30 hover:bg-white/8 hover:text-white"
                        aria-label="제거"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {job.status === 'running' || job.status === 'queued' ? (
                      <div className="mt-2">
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gold transition-[width]"
                            style={{ width: `${Math.round(job.progress * 100)}%` }}
                          />
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-white/40">
                          {job.status === 'running' ? (
                            <>
                              <LoaderCircle className="h-3 w-3 animate-spin" />
                              변환 중 {Math.round(job.progress * 100)}%
                            </>
                          ) : (
                            '대기 중'
                          )}
                        </p>
                      </div>
                    ) : null}

                    {job.status === 'error' ? (
                      <p className="mt-2 text-[11px] text-red-400">{job.error}</p>
                    ) : null}

                    {job.status === 'done' ? (
                      <button
                        type="button"
                        onClick={() => downloadOne(job)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-gold hover:underline"
                      >
                        <Download className="h-3 w-3" />
                        GIF 저장
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
