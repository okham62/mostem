'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Check, X, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DescriptionPreset {
  id: string
  name: string
  content: string
}

interface DescriptionPresetPickerProps {
  currentContent: string          // 현재 설명란 내용
  onApply: (content: string) => void  // 설명란에 적용 콜백
}

// 개별 프리셋 칩 — 호버 툴팁 포함
function PresetChip({
  preset,
  isApplied,
  onApply,
  onDelete,
}: {
  preset: DescriptionPreset
  isApplied: boolean
  onApply: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => setShowTooltip(true), 300)
  }
  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setShowTooltip(false)
  }

  // 툴팁 미리보기: 최대 120자
  const PREVIEW_LEN = 120
  const preview = preset.content.length > PREVIEW_LEN
    ? preset.content.slice(0, PREVIEW_LEN) + '...'
    : preset.content

  return (
    <div
      className="group relative flex items-stretch"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 클릭 영역 (적용) */}
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
        <span className="text-[10px] opacity-60">({preset.content.length}자)</span>
      </button>

      {/* 삭제 버튼 */}
      <button
        type="button"
        onClick={onDelete}
        title="세트 삭제"
        className={cn(
          'flex items-center rounded-r-full border border-l-0 px-1.5 transition-all',
          'border-[var(--card-border)] text-[var(--muted)]',
          'opacity-0 group-hover:opacity-100',
          'hover:border-red-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20'
        )}
      >
        <X className="h-2.5 w-2.5" />
      </button>

      {/* 호버 툴팁 — 설명 미리보기 */}
      {showTooltip && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-xl">
          {/* 말풍선 꼬리 */}
          <div className="absolute -bottom-1.5 left-4 h-3 w-3 rotate-45 border-b border-r border-[var(--card-border)] bg-[var(--card-bg)]" />

          <p className="mb-1.5 text-[11px] font-semibold text-[var(--muted)]">
            {preset.name} · {preset.content.length}자
          </p>
          <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--foreground)]">
            {preview}
          </p>
          <p className="mt-2 text-[10px] text-[var(--muted)]">
            클릭하면 현재 설명을 이 내용으로 대체합니다
          </p>
        </div>
      )}
    </div>
  )
}

export function DescriptionPresetPicker({ currentContent, onApply }: DescriptionPresetPickerProps) {
  const [presets, setPresets] = useState<DescriptionPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [newName, setNewName] = useState('')
  const [appliedId, setAppliedId] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/description-presets')
      .then(r => r.json())
      .then(data => setPresets(data.presets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (showNameInput) nameInputRef.current?.focus()
  }, [showNameInput])

  const handleApply = (preset: DescriptionPreset) => {
    onApply(preset.content)
    setAppliedId(preset.id)
    setTimeout(() => setAppliedId(null), 1500)
  }

  const handleSave = async () => {
    if (!newName.trim() || !currentContent.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/description-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), content: currentContent.trim() }),
      })
      const data = await res.json()
      if (data.preset) {
        setPresets(prev => [...prev, data.preset])
        setNewName('')
        setShowNameInput(false)
      }
    } catch {
      //
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPresets(prev => prev.filter(p => p.id !== id))
    await fetch(`/api/description-presets/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  const cancelNameInput = () => {
    setShowNameInput(false)
    setNewName('')
  }

  return (
    <div className="mb-2 rounded-xl border border-[var(--card-border)] bg-[var(--muted-bg)] p-3">
      {/* 헤더 */}
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
          <FileText className="h-3.5 w-3.5" />
          저장된 설명 세트
        </div>

        {showNameInput ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={nameInputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') cancelNameInput()
              }}
              placeholder="세트 이름 입력"
              maxLength={20}
              className="w-32 rounded-lg border border-brand bg-[var(--card-bg)] px-2 py-0.5 text-xs text-[var(--foreground)] outline-none focus:ring-1 focus:ring-brand"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !newName.trim() || !currentContent.trim()}
              className="flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              저장
            </button>
            <button type="button" onClick={cancelNameInput} className="text-[var(--muted)] hover:text-[var(--foreground)]">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNameInput(true)}
            disabled={!currentContent.trim()}
            title={!currentContent.trim() ? '설명을 먼저 입력하세요' : '현재 설명을 세트로 저장'}
            className="flex items-center gap-1 text-xs font-semibold text-brand transition-opacity hover:underline disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            현재 저장
          </button>
        )}
      </div>

      {/* 프리셋 목록 */}
      {loading ? (
        <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <Loader2 className="h-3 w-3 animate-spin" />
          불러오는 중...
        </div>
      ) : presets.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">
          아직 저장된 세트가 없어요.{' '}
          설명을 입력하고{' '}
          <span className="font-semibold text-brand">+ 현재 저장</span>
          을 눌러보세요.
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
  )
}
