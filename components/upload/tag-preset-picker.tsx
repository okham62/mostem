'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Check, X, ChevronDown, Loader2, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagPreset {
  id: string
  name: string
  tags: string[]
}

interface TagPresetPickerProps {
  currentTags: string[]
  onApply: (tags: string[]) => void
}

function PresetChip({
  preset,
  isApplied,
  onApply,
  onDelete,
}: {
  preset: TagPreset
  isApplied: boolean
  onApply: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const PREVIEW_MAX = 10
  const visibleTags = preset.tags.slice(0, PREVIEW_MAX)
  const hiddenCount = preset.tags.length - PREVIEW_MAX

  return (
    <div
      className="group relative flex items-stretch"
      onMouseEnter={() => { hoverTimer.current = setTimeout(() => setShowTooltip(true), 300) }}
      onMouseLeave={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current); setShowTooltip(false) }}
    >
      <button
        type="button"
        onClick={onApply}
        className={cn(
          'flex items-center gap-1.5 rounded-l-full border py-1 pl-3 pr-2 text-xs font-medium transition-all active:scale-95',
          isApplied
            ? 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'
            : 'border-[var(--card-border)] text-[var(--foreground)] hover:border-brand hover:bg-brand/5 hover:text-brand'
        )}
      >
        {isApplied && <Check className="h-3 w-3 shrink-0" />}
        <span>{preset.name}</span>
        <span className="text-[10px] opacity-60">({preset.tags.length})</span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        className={cn(
          'flex items-center rounded-r-full border border-l-0 px-1.5 transition-all',
          'border-[var(--card-border)] text-[var(--muted)]',
          'opacity-0 group-hover:opacity-100',
          'hover:border-red-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20'
        )}
      >
        <X className="h-2.5 w-2.5" />
      </button>

      {/* 툴팁 */}
      {showTooltip && preset.tags.length > 0 && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-xl">
          <div className="absolute -top-1.5 right-4 h-3 w-3 rotate-45 border-l border-t border-[var(--card-border)] bg-[var(--card-bg)]" />
          <p className="mb-2 text-[11px] font-semibold text-[var(--muted)]">{preset.name} · 태그 {preset.tags.length}개</p>
          <div className="flex flex-wrap gap-1">
            {visibleTags.map(tag => (
              <span key={tag} className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">#{tag}</span>
            ))}
            {hiddenCount > 0 && (
              <span className="rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[11px] text-[var(--muted)]">+{hiddenCount}개 더</span>
            )}
          </div>
          <p className="mt-2 text-[10px] text-[var(--muted)]">클릭하면 현재 태그에 추가됩니다</p>
        </div>
      )}
    </div>
  )
}

export function TagPresetPicker({ currentTags, onApply }: TagPresetPickerProps) {
  const [open, setOpen] = useState(false)
  const [presets, setPresets] = useState<TagPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [newName, setNewName] = useState('')
  const [appliedId, setAppliedId] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/tag-presets')
      .then(r => r.json())
      .then(data => setPresets(data.presets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowNameInput(false)
        setNewName('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (showNameInput) nameInputRef.current?.focus()
  }, [showNameInput])

  const handleApply = (preset: TagPreset) => {
    onApply(preset.tags)
    setAppliedId(preset.id)
    setOpen(false)
    setTimeout(() => setAppliedId(null), 1500)
  }

  const handleSave = async () => {
    if (!newName.trim() || currentTags.length === 0 || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/tag-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), tags: currentTags }),
      })
      const data = await res.json()
      if (data.preset) {
        setPresets(prev => [...prev, data.preset])
        setNewName('')
        setShowNameInput(false)
      }
    } catch { /**/ } finally { setSaving(false) }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPresets(prev => prev.filter(p => p.id !== id))
    await fetch(`/api/tag-presets/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  return (
    <div ref={containerRef} className="relative">
      {/* 트리거 버튼 */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setShowNameInput(false); setNewName('') }}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
          open
            ? 'border-brand bg-brand/5 text-brand'
            : 'border-[var(--card-border)] text-[var(--muted)] hover:border-brand hover:text-brand'
        )}
      >
        <Bookmark className="h-3.5 w-3.5" />
        저장된 세트
        {presets.length > 0 && (
          <span className="rounded-full bg-brand/10 px-1.5 text-[10px] font-bold text-brand">{presets.length}</span>
        )}
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {/* 드롭다운 패널 */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-2xl">
          <div className="absolute -top-1.5 right-5 h-3 w-3 rotate-45 border-l border-t border-[var(--card-border)] bg-[var(--card-bg)]" />

          {/* 헤더 */}
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--muted)]">저장된 태그 세트</p>
            {showNameInput ? (
              <div className="flex items-center gap-1.5">
                <input
                  ref={nameInputRef}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setShowNameInput(false); setNewName('') } }}
                  placeholder="세트 이름"
                  maxLength={20}
                  className="w-28 rounded-lg border border-brand bg-[var(--muted-bg)] px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-brand"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !newName.trim() || currentTags.length === 0}
                  className="flex items-center gap-1 rounded-lg bg-brand px-2 py-0.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  저장
                </button>
                <button type="button" onClick={() => { setShowNameInput(false); setNewName('') }}>
                  <X className="h-3.5 w-3.5 text-[var(--muted)]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNameInput(true)}
                disabled={currentTags.length === 0}
                title={currentTags.length === 0 ? '태그를 먼저 입력하세요' : '현재 태그 저장'}
                className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />현재 저장
              </button>
            )}
          </div>

          {/* 프리셋 목록 */}
          {loading ? (
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <Loader2 className="h-3 w-3 animate-spin" />불러오는 중...
            </div>
          ) : presets.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">
              태그를 입력하고 <span className="font-semibold text-brand">+ 현재 저장</span>을 눌러보세요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {presets.map(preset => (
                <PresetChip
                  key={preset.id}
                  preset={preset}
                  isApplied={appliedId === preset.id}
                  onApply={() => handleApply(preset)}
                  onDelete={e => handleDelete(preset.id, e)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
