'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Download,
  Film,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { formatBytes } from '@/lib/gif-convert'
import { cn } from '@/lib/utils'

export type HistoryJob = {
  id: string
  kind: string
  label: string
  settings: Record<string, unknown>
  source_names: string[]
  result_bytes: number | null
  width: number | null
  height: number | null
  frames: number | null
  status: string
  created_at: string
  resultUrl: string | null
  sourceUrls: { name: string; url: string; path: string }[]
}

type Props = {
  onRework: (job: HistoryJob) => Promise<void> | void
}

function kindLabel(kind: string) {
  if (kind === 'slideshow') return '슬라이드'
  if (kind === 'image') return '이미지'
  return '동영상'
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

async function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function downloadViaApi(
  id: string,
  which: 'result' | 'source',
  index?: number,
  filename?: string
) {
  const res = await fetch(`/api/gif/history/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ which, index }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || '다운로드 실패')
  }
  const blob = await res.blob()
  await triggerBlobDownload(blob, filename || (which === 'result' ? 'result.gif' : 'source'))
}

export function GifHistoryPanel({ onRework }: Props) {
  const [jobs, setJobs] = useState<HistoryJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/gif/history')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '불러오기 실패')
      setJobs((data.jobs ?? []) as HistoryJob[])
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패')
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function removeJob(id: string) {
    if (!confirm('이 작업 기록과 첨부 파일을 삭제할까요?')) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/gif/history/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '삭제 실패')
      setJobs((prev) => prev.filter((j) => j.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRework(job: HistoryJob) {
    setBusyId(job.id)
    try {
      await onRework(job)
    } catch (e) {
      alert(e instanceof Error ? e.message : '재작업 준비 실패')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-white/45">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        작업 기록 불러오는 중…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center">
        <p className="text-sm text-red-300">{error}</p>
        <p className="mt-2 text-xs text-white/40">
          Supabase에 <code className="text-white/60">gif_jobs</code> 테이블이 없으면 SQL을 먼저
          실행하세요.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          다시 시도
        </button>
      </div>
    )
  }

  if (!jobs.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-14 text-center">
        <p className="text-sm text-white/55">아직 저장된 작업 기록이 없습니다.</p>
        <p className="mt-1 text-xs text-white/35">
          GIF 변환이 끝나면 원본·결과·설정이 계정에 자동 저장됩니다.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-white/45">계정별 작업 기록 · {jobs.length}건</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/8 px-2.5 py-1.5 text-[11px] font-semibold text-white/55 hover:text-white"
        >
          <RefreshCw className="h-3 w-3" />
          새로고침
        </button>
      </div>

      <ul className="space-y-3">
        {jobs.map((job) => {
          const busy = busyId === job.id
          return (
            <li
              key={job.id}
              className="rounded-2xl border border-white/10 bg-[var(--card-bg)] p-3 sm:p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="group relative mx-auto h-28 w-28 shrink-0 overflow-visible rounded-xl bg-black/40 sm:mx-0">
                  {job.resultUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={job.resultUrl}
                        alt=""
                        className="h-28 w-28 rounded-xl object-cover"
                      />
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-[240px] -translate-x-1/2 rounded-xl border border-white/15 bg-black/95 p-1.5 shadow-2xl group-hover:block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={job.resultUrl}
                          alt=""
                          className="max-h-[360px] w-full rounded-lg object-contain"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/30">
                      {job.kind === 'video' ? (
                        <Film className="h-6 w-6" />
                      ) : (
                        <ImageIcon className="h-6 w-6" />
                      )}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{job.label}</p>
                      <p className="mt-0.5 text-[11px] text-white/40">
                        {kindLabel(job.kind)} · {formatWhen(job.created_at)}
                        {job.status !== 'done' ? ` · ${job.status}` : ''}
                      </p>
                      <p className="mt-1 text-[11px] text-white/45">
                        {job.width && job.height ? `${job.width}×${job.height}` : null}
                        {job.frames != null ? ` · ${job.frames}프레임` : null}
                        {job.result_bytes != null ? ` · ${formatBytes(job.result_bytes)}` : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeJob(job.id)}
                      className="rounded-md p-1.5 text-white/30 hover:bg-white/8 hover:text-white disabled:opacity-40"
                      aria-label="삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {job.sourceUrls?.length ? (
                    <div className="mt-3">
                      <p className="mb-1.5 text-[11px] font-medium text-white/50">첨부 원본</p>
                      <div className="flex flex-wrap gap-2">
                        {job.sourceUrls.map((src, idx) => (
                          <a
                            key={`${job.id}-src-${idx}`}
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white/70 hover:border-white/25 hover:text-white"
                            title={src.name}
                          >
                            {/\.(mp4|webm|mov|mkv)$/i.test(src.name) ? (
                              <Film className="h-3 w-3 shrink-0" />
                            ) : (
                              <ImageIcon className="h-3 w-3 shrink-0" />
                            )}
                            <span className="truncate">{src.name}</span>
                            <button
                              type="button"
                              className="shrink-0 text-gold hover:underline"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                void downloadViaApi(job.id, 'source', idx, src.name).catch((err) =>
                                  alert(err instanceof Error ? err.message : '실패')
                                )
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </button>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || !job.resultUrl}
                      onClick={() => {
                        void downloadViaApi(
                          job.id,
                          'result',
                          undefined,
                          `${(job.label || 'gif').replace(/[^\w.\-가-힣]+/g, '_').slice(0, 60)}.gif`
                        ).catch((err) => alert(err instanceof Error ? err.message : '실패'))
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white',
                        'disabled:opacity-40'
                      )}
                    >
                      <Download className="h-3.5 w-3.5" />
                      GIF 다운로드
                    </button>
                    <button
                      type="button"
                      disabled={busy || !job.sourceUrls?.length}
                      onClick={() => void handleRework(job)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/15 disabled:opacity-40"
                    >
                      {busy ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      재작업
                    </button>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
