'use client'

import { useRef, useState, type DragEvent } from 'react'
import { BookOpen, Paperclip, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { MAX_GUIDE_FILES, type AiGuide } from '@/lib/ai-guides'

export function GuidesClient({ initial }: { initial: AiGuide[] }) {
  const [guides, setGuides] = useState(initial)
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? '')
  const selected = guides.find((item) => item.id === selectedId)
  const [name, setName] = useState(selected?.name ?? '')
  const [content, setContent] = useState(selected?.content ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

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

  async function uploadFiles(list: FileList | File[] | null) {
    if (!selected || selected.builtin) {
      setMessage('먼저 지침서를 저장한 뒤 파일을 올리세요.')
      return
    }
    const incoming = [...(list ?? [])]
    if (!incoming.length) return

    const existing = new Set((selected.files ?? []).map((item) => item.name))
    const dupes = incoming.filter((file) => existing.has(file.name))
    const unique = incoming.filter((file) => !existing.has(file.name))
    let files = unique
    if (dupes.length) {
      const names = dupes.map((file) => `「${file.name}」`).join(', ')
      const replace = window.confirm(
        `${names} 같은 이름 파일이 이미 있습니다.\n이 파일로 바꿀까요?`,
      )
      if (replace) files = [...unique, ...dupes]
      else if (!unique.length) {
        setMessage('같은 이름이라 올리지 않았습니다.')
        if (fileInput.current) fileInput.current.value = ''
        return
      }
    }

    setSaving(true)
    setMessage('')
    try {
      let latest = guides
      for (const file of files) {
        const body = new FormData()
        body.append('file', file)
        const res = await fetch(`/api/ai-guides/${selected.id}/files`, { method: 'POST', body })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setMessage(data.error || `${file.name}을 올리지 못했습니다.`)
          return
        }
        if (Array.isArray(data.guides)) {
          latest = data.guides
          setGuides(data.guides)
        }
      }
      setGuides(latest)
      const nextCount = latest.find((item) => item.id === selected.id)?.files?.length
      setMessage(`파일을 올렸습니다. 글 쓸 때 지침서와 함께 참고합니다. (${nextCount ?? files.length}/${MAX_GUIDE_FILES})`)
    } finally {
      setSaving(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function canDropFiles() {
    return Boolean(selected && !selected.builtin && !saving)
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (!canDropFiles()) return
    event.dataTransfer.dropEffect = 'copy'
    setDragging(true)
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return
    setDragging(false)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    if (!canDropFiles()) {
      setMessage('먼저 지침서를 저장한 뒤 파일을 올리세요.')
      return
    }
    void uploadFiles(event.dataTransfer.files)
  }

  async function removeFile(fileId: string) {
    if (!selected || selected.builtin) return
    setSaving(true)
    const res = await fetch(`/api/ai-guides/${selected.id}/files`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMessage(data.error || '파일을 삭제하지 못했습니다.')
      return
    }
    if (Array.isArray(data.guides)) setGuides(data.guides)
    setMessage('파일을 뺐습니다.')
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
                <span className="ml-2 flex shrink-0 items-center gap-1">
                  {guide.files?.length ? (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
                      파일 {guide.files.length}
                    </span>
                  ) : null}
                  {guide.isDefault ? (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
                      기본
                    </span>
                  ) : null}
                </span>
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
          <div
            className={`rounded-xl border bg-black/20 p-3 transition-colors ${
              dragging ? 'border-brand bg-brand/10' : 'border-white/10'
            }`}
            onDragEnter={onDragOver}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <Paperclip className="h-4 w-4 text-brand" />
                참고 파일 {(selected?.files?.length || 0)}/{MAX_GUIDE_FILES}
              </p>
              <button
                type="button"
                disabled={saving || !selected || selected.builtin}
                onClick={() => fileInput.current?.click()}
                className="rounded-lg bg-white/8 px-2.5 py-1 text-[11px] text-white/80 disabled:opacity-40"
              >
                파일 올리기
              </button>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-white/40">
              엑셀, 워드, PPT, PDF를 여기로 끌어다 놓거나 파일 올리기로 첨부하세요.
              같은 이름 파일이 있으면 경고가 뜹니다.
            </p>
            <div
              className={`mt-2 rounded-lg border border-dashed px-3 py-4 text-center text-[11px] ${
                dragging ? 'border-brand text-brand' : 'border-white/15 text-white/35'
              }`}
            >
              {dragging ? '여기에 놓으면 올라갑니다' : '이 칸으로 파일을 드래그해서 올리기'}
            </div>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept=".xlsx,.xls,.docx,.doc,.pptx,.ppt,.pdf,.txt,.md,.csv,.json"
              className="hidden"
              onChange={(event) => void uploadFiles(event.target.files)}
            />
            {selected?.files?.length ? (
              <ul className="mt-2 space-y-1">
                {selected.files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white/80"
                  >
                    <span className="min-w-0 truncate">{file.name}</span>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void removeFile(file.id)}
                      className="shrink-0 text-white/40 hover:text-red-300"
                    >
                      빼기
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] text-white/35">
                {selected && !selected.builtin
                  ? '아직 올린 파일이 없습니다. 파일이 없으면 지침서만으로 글을 씁니다.'
                  : '지침서를 먼저 저장하면 파일을 올릴 수 있습니다.'}
              </p>
            )}
          </div>
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
