'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Download, Film, ImageIcon, LoaderCircle, Trash2, Upload } from 'lucide-react'
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
  /** Display name */
  label: string
  /** One file, or many images for a slideshow job */
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

const MAX_WIDTH = 480
const FPS = 10
const MAX_COLORS = 128
const IMAGE_DELAY = 80

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function GifConverterClient() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const jobsRef = useRef<Job[]>([])
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [mergeImages, setMergeImages] = useState(false)
  const runningRef = useRef(false)

  const syncJobs = useCallback((updater: (prev: Job[]) => Job[]) => {
    setJobs((prev) => {
      const next = updater(prev)
      jobsRef.current = next
      return next
    })
  }, [])

  const doneCount = useMemo(() => jobs.filter((j) => j.status === 'done').length, [jobs])
  const totalBytes = useMemo(
    () => jobs.reduce((sum, j) => sum + (j.result?.bytes ?? 0), 0),
    [jobs]
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
    try {
      while (true) {
        const next = jobsRef.current.find((job) => job.status === 'queued')
        if (!next) break
        patchJob(next.id, { status: 'running', progress: 0, error: undefined })
        try {
          const opts = {
            maxWidth: MAX_WIDTH,
            fps: FPS,
            maxColors: MAX_COLORS,
            imageDelay: IMAGE_DELAY,
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
      }
    } finally {
      runningRef.current = false
      setBusy(false)
    }
  }, [patchJob])

  const addFiles = useCallback(
    (fileList: FileList | File[], asSlideshow = mergeImages) => {
      const media = [...fileList].filter((file) => isVideoFile(file) || isImageFile(file))
      if (!media.length) return

      const videos = media.filter(isVideoFile)
      const images = media.filter(isImageFile)
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

      if (asSlideshow && images.length >= 2) {
        next.push({
          id: newId(),
          label: `이미지 ${images.length}장 슬라이드`,
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
    [mergeImages, pump, syncJobs]
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
    const done = jobs.filter((j) => j.status === 'done' && j.result)
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

      <div className="mb-5">
        <h1 className="text-lg font-bold text-white">상세페이지 GIF 변환</h1>
        <p className="mt-1 text-sm text-white/45">
          영상(MP4)과 이미지를 GIF로 바꿉니다. 서버 업로드 없이 브라우저에서만 변환됩니다.
        </p>
      </div>

      <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-white/55">
        <input
          type="checkbox"
          checked={mergeImages}
          onChange={(e) => setMergeImages(e.target.checked)}
          className="rounded border-white/20 bg-black/40"
        />
        여러 이미지를 <span className="font-semibold text-white/80">하나의 슬라이드 GIF</span>로
        합치기
      </label>

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
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
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
          <Upload className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold text-white">파일 끌어다 놓거나 클릭</p>
        <p className="mt-1 text-xs text-white/40">MP4 · WebM · MOV · PNG · JPG · WEBP</p>
        <p className="mt-3 text-[11px] text-white/30">
          영상: 최대 가로 {MAX_WIDTH}px · {FPS}fps · 앞 12초 / 이미지: {MAX_COLORS}색 ·{' '}
          {(IMAGE_DELAY / 100).toFixed(1)}초 유지
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="video/*,image/*,.mp4,.webm,.mov,.m4v,.png,.jpg,.jpeg,.webp,.bmp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {jobs.length > 0 ? (
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-white/45">
              {doneCount}/{jobs.length} 완료
              {totalBytes > 0 ? ` · 합계 ${formatBytes(totalBytes)}` : ''}
              {busy ? ' · 변환 중…' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadAll}
                disabled={doneCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                {doneCount > 1 ? 'ZIP 다운로드' : '다운로드'}
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
            {jobs.map((job) => (
              <li key={job.id} className="rounded-xl border border-white/10 bg-[var(--card-bg)] p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/40">
                    {job.result?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={job.result.url} alt="" className="h-full w-full object-cover" />
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
