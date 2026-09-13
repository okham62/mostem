'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { AI_MODELS, DEFAULT_AI_MODEL, type AiModelOption } from '@/lib/ai-models'
import { cn } from '@/lib/utils'

export function ModelPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [models, setModels] = useState<AiModelOption[]>(AI_MODELS)
  const root = useRef<HTMLDivElement>(null)
  const selected = models.find((item) => item.id === value) ?? DEFAULT_AI_MODEL
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q
      ? models.filter((item) => `${item.label} ${item.id}`.toLowerCase().includes(q))
      : models.filter((item) => item.recommended)
  }, [models, query])

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // The server only lists models whose provider key is configured, so an operator
  // can never pick a model that will fail on generate.
  useEffect(() => {
    let alive = true
    fetch('/api/ai-models', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { models?: AiModelOption[] } | null) => {
        if (!alive || !data?.models?.length) return
        setModels(data.models)
      })
      .catch(() => {
        /* keep the built-in list */
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 max-w-[220px] items-center gap-1.5 rounded-lg bg-white/8 px-2.5 text-[11px] text-white/75 hover:bg-white/12"
      >
        <ModelIcon provider={selected.provider} />
        <span className="truncate">
          {selected.label}
          {selected.isDefault ? ' (기본)' : ''}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/40" />
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-40 mb-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a20] shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
          <label className="flex items-center gap-2 border-b border-white/8 px-3 py-2.5">
            <Search className="h-3.5 w-3.5 text-white/30" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="모델 검색 — 예: claude, gemini..."
              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/30"
            />
          </label>
          <p className="px-3 pb-1 pt-2 text-[10px] text-white/35">추천 모델 (검증됨)</p>
          <div className="max-h-64 overflow-y-auto py-1">
            {rows.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-white/35">검색 결과가 없습니다.</p>
            ) : (
              rows.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.id)
                    setOpen(false)
                    setQuery('')
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5',
                    item.id === selected.id && 'bg-white/[0.04]'
                  )}
                >
                  <ModelIcon provider={item.provider} />
                  <span className="min-w-0 flex-1 truncate text-xs text-white">{item.label}</span>
                  <span className="shrink-0 text-[10px] text-white/40">{item.credits}크레딧</span>
                  {item.id === selected.id ? <Check className="h-3.5 w-3.5 text-white" /> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ModelIcon({ provider }: { provider: AiModelOption['provider'] }) {
  const gemini = provider === 'gemini'
  return (
    <span
      className={cn(
        'flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
        gemini ? 'bg-sky-500/20 text-sky-300' : 'bg-orange-500/20 text-orange-300'
      )}
    >
      {gemini ? '◆' : '✱'}
    </span>
  )
}
