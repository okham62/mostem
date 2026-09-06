'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import {
  allThreadTemplates,
  loadCustomTemplates,
  saveCustomTemplates,
  type ThreadTemplate,
  type ThreadTemplateCategory,
} from '@/lib/thread-templates'

export function TemplateModal({
  onClose,
  onInsert,
}: {
  onClose: () => void
  onInsert: (body: string) => void
}) {
  const [category, setCategory] = useState<ThreadTemplateCategory>('ftc')
  const [custom, setCustom] = useState<ThreadTemplate[]>(() => loadCustomTemplates())
  const [draft, setDraft] = useState('')
  const [copiedId, setCopiedId] = useState('')

  const rows = useMemo(
    () => allThreadTemplates(custom).filter((item) => item.category === category),
    [custom, category]
  )

  async function copy(item: ThreadTemplate) {
    try {
      await navigator.clipboard.writeText(item.body)
      setCopiedId(item.id)
      window.setTimeout(() => setCopiedId((id) => (id === item.id ? '' : id)), 1200)
    } catch {
      /* ignore */
    }
  }

  function saveDraft() {
    const body = draft.trim()
    if (!body) return
    const item: ThreadTemplate = {
      id: `custom-${Date.now()}`,
      category,
      title: body.slice(0, 18) + (body.length > 18 ? '…' : ''),
      body,
    }
    const next = [...custom, item]
    setCustom(next)
    saveCustomTemplates(next)
    setDraft('')
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[min(88vh,720px)] w-full max-w-xl flex-col rounded-2xl border border-white/10 bg-[#1a1a20] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-lg font-bold text-white">템플릿</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-white/40">누르면 바로 복사돼요. 타래에 붙여넣으면 끝이에요.</p>

        <div className="mb-4 inline-flex rounded-full bg-black/35 p-1 ring-1 ring-white/10">
          {(
            [
              ['ftc', '공정위'],
              ['thread', '타래'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                category === id ? 'bg-white/12 text-white' : 'text-white/45 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/35">아직 저장한 문구가 없어요.</p>
          ) : (
            rows.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3"
              >
                <button type="button" onClick={() => void copy(item)} className="min-w-0 flex-1 text-left">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    {item.title}
                    {item.builtin ? (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/40">
                        기본
                      </span>
                    ) : null}
                    {copiedId === item.id ? (
                      <span className="text-[10px] font-medium text-gold">복사됨</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/45">{item.body}</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onInsert(item.body)
                    onClose()
                  }}
                  className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/15"
                >
                  타래에 넣기
                </button>
              </div>
            ))
          )}
        </div>

        <div className="relative mt-4 rounded-xl border border-dashed border-white/15 bg-black/25 p-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            placeholder="자주 쓰는 타래 문구를 붙여넣으세요"
            className="w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={saveDraft}
              className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white/80 disabled:opacity-40"
            >
              + 템플릿으로 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
