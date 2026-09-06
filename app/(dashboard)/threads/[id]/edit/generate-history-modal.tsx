'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { findAiModel } from '@/lib/ai-models'
import type { GenerateRun } from '@/lib/edit-drafts'

function whenLabel(at: number) {
  return new Date(at).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function GenerateHistoryModal({
  runs,
  onClose,
  onApply,
}: {
  runs: GenerateRun[]
  onClose: () => void
  onApply: (run: GenerateRun) => void
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="generate-history-title"
        className="flex max-h-[min(88vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141418] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h2 id="generate-history-title" className="text-lg font-bold text-white">
              생성 기록
            </h2>
            <p className="mt-1 text-xs text-white/40">예전에 만든 초안을 다시 불러올 수 있어요</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-1 text-white/40 hover:text-white">
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin">
          {runs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 py-16 text-center text-sm text-white/40">
              아직 생성한 기록이 없어요
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run, index) => {
                const model = run.model ? findAiModel(run.model).label : '이전 초안'
                return (
                  <article key={run.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {index === 0 ? '가장 최근' : `${index + 1}번째 기록`} · {model}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/40">{whenLabel(run.at)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onApply(run)}
                        className="shrink-0 rounded-lg bg-brand px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand/90"
                      >
                        불러오기
                      </button>
                    </div>
                    {run.instruction ? (
                      <p className="mb-2 text-[11px] text-white/45">지시: {run.instruction}</p>
                    ) : null}
                    <div className="space-y-1.5">
                      {run.drafts.map((text, draftIndex) =>
                        text ? (
                          <p
                            key={`${run.id}-${draftIndex}`}
                            className="line-clamp-2 rounded-lg bg-white/5 px-2.5 py-2 text-[12px] leading-relaxed text-white/75"
                          >
                            <span className="mr-1.5 text-[10px] font-semibold text-white/35">
                              {draftIndex + 1}안
                            </span>
                            {text}
                          </p>
                        ) : null
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
