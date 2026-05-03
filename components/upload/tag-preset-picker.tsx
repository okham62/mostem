'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Check, X, Bookmark, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagPreset {
  id: string
  name: string
  tags: string[]
}

interface TagPresetPickerProps {
  currentTags: string[]        // 현재 폼에 입력된 태그 배열
  onApply: (tags: string[]) => void  // 태그 병합 콜백
}

export function TagPresetPicker({ currentTags, onApply }: TagPresetPickerProps) {
  const [presets, setPresets] = useState<TagPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [newName, setNewName] = useState('')
  const [appliedId, setAppliedId] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/tag-presets')
      .then(r => r.json())
      .then(data => setPresets(data.presets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (showNameInput) nameInputRef.current?.focus()
  }, [showNameInput])

  // 프리셋 적용 (현재 태그와 병합, 중복 제외)
  const handleApply = (preset: TagPreset) => {
    onApply(preset.tags)
    setAppliedId(preset.id)
    setTimeout(() => setAppliedId(null), 1500)
  }

  // 프리셋 저장
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
    } catch {
      // 저장 실패 무시
    } finally {
      setSaving(false)
    }
  }

  // 프리셋 삭제 (낙관적 업데이트)
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPresets(prev => prev.filter(p => p.id !== id))
    await fetch(`/api/tag-presets/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  const cancelNameInput = () => {
    setShowNameInput(false)
    setNewName('')
  }

  return (
    <div className="mb-3 rounded-xl border border-[var(--card-border)] bg-[var(--muted-bg)] p-3">
      {/* 헤더 */}
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
          <Bookmark className="h-3.5 w-3.5" />
          저장된 태그 세트
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
              disabled={saving || !newName.trim() || currentTags.length === 0}
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
            disabled={currentTags.length === 0}
            title={currentTags.length === 0 ? '태그를 먼저 입력하세요' : '현재 태그를 세트로 저장'}
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
          아직 저장된 세트가 없어요. 태그를 입력하고 <span className="font-semibold text-brand">+ 현재 저장</span>을 눌러보세요.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {presets.map(preset => {
            const isApplied = appliedId === preset.id
            return (
              <div key={preset.id} className="group flex items-stretch">
                {/* 클릭 영역 (적용) */}
                <button
                  type="button"
                  onClick={() => handleApply(preset)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-l-full border py-1 pl-3 pr-2 text-xs font-medium transition-all active:scale-95',
                    isApplied
                      ? 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'border-[var(--card-border)] text-[var(--foreground)] hover:border-brand hover:bg-brand/5 hover:text-brand'
                  )}
                >
                  {isApplied
                    ? <Check className="h-3 w-3 shrink-0" />
                    : null
                  }
                  <span>{preset.name}</span>
                  <span className="text-[10px] opacity-60">({preset.tags.length})</span>
                </button>

                {/* 삭제 버튼 (호버 시 표시) */}
                <button
                  type="button"
                  onClick={e => handleDelete(preset.id, e)}
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
