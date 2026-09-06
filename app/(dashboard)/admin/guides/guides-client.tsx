'use client'

import { useState } from 'react'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { AiGuide } from '@/lib/ai-guides'

export function GuidesClient({ initial }: { initial: AiGuide[] }) {
  const [guides, setGuides] = useState(initial)
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? '')
  const selected = guides.find((item) => item.id === selectedId) ?? guides[0]
  const [name, setName] = useState(selected?.name ?? '')
  const [content, setContent] = useState(selected?.content ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  function openGuide(guide: AiGuide) {
    setSelectedId(guide.id)
    setName(guide.name)
    setContent(guide.content)
    setMessage('')
  }

  async function reload() {
    const res = await fetch('/api/ai-guides', { cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    if (Array.isArray(data.guides)) setGuides(data.guides)
    return (data.guides ?? []) as AiGuide[]
  }

  async function save() {
    if (!name.trim() || !content.trim()) {
      setMessage('이름과 내용을 입력하세요.')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      if (!selected || selected.builtin) {
        const res = await fetch('/api/ai-guides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), content }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setMessage(data.error || '저장에 실패했습니다.')
          return
        }
        const next = await reload()
        const created = data.guide as AiGuide | undefined
        if (created) openGuide(next.find((item) => item.id === created.id) ?? created)
        setMessage('지침서를 만들었습니다.')
        return
      }
      const res = await fetch(`/api/ai-guides/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), content }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data.error || '수정에 실패했습니다.')
        return
      }
      if (Array.isArray(data.guides)) setGuides(data.guides)
      else await reload()
      setMessage('저장했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function setDefault() {
    if (!selected || selected.builtin) {
      setMessage('먼저 지침서를 저장하세요.')
      return
    }
    setSaving(true)
    const res = await fetch(`/api/ai-guides/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMessage(data.error || '기본 지정에 실패했습니다.')
      return
    }
    if (Array.isArray(data.guides)) setGuides(data.guides)
    setMessage('기본 지침서로 지정했습니다.')
  }

  async function remove() {
    if (!selected || selected.builtin) return
    if (!window.confirm(`「${selected.name}」 지침서를 삭제할까요?`)) return
    setSaving(true)
    const res = await fetch(`/api/ai-guides/${selected.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMessage(data.error || '삭제에 실패했습니다.')
      return
    }
    const next = Array.isArray(data.guides) ? data.guides : await reload()
    setGuides(next)
    if (next[0]) openGuide(next[0])
    setMessage('삭제했습니다.')
  }

  function startNew() {
    setSelectedId('')
    setName('')
    setContent('')
    setMessage('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI 지침서</h1>
        <p className="mt-2 text-sm text-white/45">
          스레드 「내 글로 바꾸기」에서 쓸 말투·규칙을 관리자가 여러 개 만들어 두고, 편집 화면에서 고르게 합니다.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <BookOpen className="h-4 w-4 text-brand" />
              지침서 목록
            </p>
            <button
              type="button"
              onClick={startNew}
              className="inline-flex items-center gap-1 rounded-lg bg-brand/20 px-2 py-1 text-[11px] text-brand"
            >
              <Plus className="h-3 w-3" />
              새 지침서
            </button>
          </div>
          <div className="space-y-1">
            {guides.map((guide) => (
              <button
                key={guide.id}
                type="button"
                onClick={() => openGuide(guide)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                  selectedId === guide.id ? 'bg-brand/20 text-white' : 'text-white/60 hover:bg-white/5'
                }`}
              >
                <span className="truncate">{guide.name}</span>
                {guide.isDefault ? (
                  <span className="ml-2 shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
                    기본
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="지침서 이름 (예: 방뱅이 v1)"
            className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-brand"
          />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={16}
            placeholder="AI가 글을 쓸 때 따를 규칙을 적어 주세요."
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-brand"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {selected && !selected.builtin ? '수정 저장' : '지침서 만들기'}
            </button>
            {selected && !selected.builtin ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void setDefault()}
                  className="rounded-xl bg-white/8 px-4 py-2 text-sm text-white/80"
                >
                  기본으로
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void remove()}
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  삭제
                </button>
              </>
            ) : null}
            {message ? <p className="text-xs text-gold">{message}</p> : null}
          </div>
        </Card>
      </div>
    </div>
  )
}
