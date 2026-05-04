'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, X, GripVertical, Images } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PhotoItem {
  id: string
  file: File
  previewUrl: string
}

interface PhotoUploadGridProps {
  photos: PhotoItem[]
  maxCount: number
  onChange: (photos: PhotoItem[]) => void
}

// ── 개별 사진 썸네일 ──────────────────────────────────────────
function SortablePhoto({
  photo,
  index,
  onRemove,
}: {
  photo: PhotoItem
  index: number
  onRemove: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // useCallback은 반드시 컴포넌트 최상단에서만 호출
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }, [])

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="group relative aspect-square rounded-xl overflow-hidden border-2 border-[var(--card-border)] bg-[var(--muted-bg)] cursor-grab active:cursor-grabbing"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={handleMouseMove}
        {...attributes}
        {...listeners}
      >
        <img src={photo.previewUrl} alt={`사진 ${index + 1}`} className="h-full w-full object-cover" draggable={false} />

        <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">
          {index + 1}
        </div>

        <div className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-white drop-shadow" />
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
        >
          <X className="h-3 w-3" />
        </button>

        <div className={cn('absolute inset-0 bg-black/10 transition-opacity', hovered ? 'opacity-100' : 'opacity-0')} />
      </div>

      {hovered && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: mousePos.x + 20,
            top: mousePos.y - 220,
            transform: mousePos.x > window.innerWidth - 420 ? 'translateX(calc(-100% - 40px))' : 'none',
          }}
        >
          <div className="rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl shadow-black/50">
            <img src={photo.previewUrl} alt="미리보기" className="h-96 w-96 object-cover" draggable={false} />
          </div>
          <p className="mt-1 text-center text-[10px] text-white/80 drop-shadow">
            {(photo.file.size / (1024 * 1024)).toFixed(1)} MB · {photo.file.name}
          </p>
        </div>
      )}
    </>
  )
}

function DragGhost({ photo }: { photo: PhotoItem }) {
  return (
    <div className="aspect-square w-24 rounded-xl overflow-hidden border-2 border-brand shadow-2xl rotate-3 scale-110">
      <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" draggable={false} />
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export function PhotoUploadGrid({ photos, maxCount, onChange }: PhotoUploadGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const outerRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const dragDepth = useRef(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    const toAdd = arr.slice(0, maxCount - photos.length)
    if (!toAdd.length) return
    const newPhotos: PhotoItem[] = toAdd.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    onChange([...photos, ...newPhotos])
  }, [photos, maxCount, onChange])

  // ── 네이티브 DOM 이벤트로 파일 드래그 처리 (React 합성 이벤트 우회) ──
  useEffect(() => {
    const el = outerRef.current
    if (!el) return

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault()
      dragDepth.current += 1
      setIsDraggingOver(true)
    }
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault()
      dragDepth.current -= 1
      if (dragDepth.current <= 0) {
        dragDepth.current = 0
        setIsDraggingOver(false)
      }
    }
    const onDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragDepth.current = 0
      setIsDraggingOver(false)
      if (e.dataTransfer?.files?.length) {
        addFiles(e.dataTransfer.files)
      }
    }

    el.addEventListener('dragenter', onDragEnter)
    el.addEventListener('dragleave', onDragLeave)
    el.addEventListener('dragover', onDragOver)
    el.addEventListener('drop', onDrop)

    return () => {
      el.removeEventListener('dragenter', onDragEnter)
      el.removeEventListener('dragleave', onDragLeave)
      el.removeEventListener('dragover', onDragOver)
      el.removeEventListener('drop', onDrop)
    }
  }, [addFiles])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  const removePhoto = (id: string) => {
    const p = photos.find(p => p.id === id)
    if (p) URL.revokeObjectURL(p.previewUrl)
    onChange(photos.filter(p => p.id !== id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = photos.findIndex(p => p.id === active.id)
    const newIdx = photos.findIndex(p => p.id === over.id)
    onChange(arrayMove(photos, oldIdx, newIdx))
  }

  const activePhoto = activeId ? photos.find(p => p.id === activeId) : null
  const canAddMore = photos.length < maxCount

  return (
    <div ref={outerRef} className="relative">
      {/* 드래그 오버 시 전체 오버레이 */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl border-2 border-brand bg-brand/10 pointer-events-none">
          <Images className="h-10 w-10 text-brand" />
          <p className="mt-2 text-sm font-semibold text-brand">여기에 놓으세요!</p>
          <p className="text-xs text-brand/70">최대 {maxCount}장</p>
        </div>
      )}

      {/* 빈 상태 */}
      {photos.length === 0 ? (
        <label
          htmlFor="photo-file-input"
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 transition-colors border-[var(--card-border)] hover:border-brand hover:bg-brand/5"
        >
          <Images className="h-10 w-10 text-[var(--muted)]" />
          <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
            사진을 드래그하거나 클릭하여 선택
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            JPEG, PNG · Instagram 최대 10장 / TikTok 최대 35장
          </p>
        </label>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={photos.map(p => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {photos.map((photo, index) => (
                <SortablePhoto
                  key={photo.id}
                  photo={photo}
                  index={index}
                  onRemove={() => removePhoto(photo.id)}
                />
              ))}
              {canAddMore && (
                <label
                  htmlFor="photo-file-input"
                  className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors border-[var(--card-border)] hover:border-brand hover:bg-brand/5"
                >
                  <Plus className="h-6 w-6 text-[var(--muted)]" />
                  <span className="mt-1 text-[10px] text-[var(--muted)]">추가</span>
                </label>
              )}
            </div>
          </SortableContext>
          <DragOverlay>
            {activePhoto && <DragGhost photo={activePhoto} />}
          </DragOverlay>
        </DndContext>
      )}

      <input
        id="photo-file-input"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {photos.length > 0 && (
        <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
          <span>드래그로 순서 변경 · 마우스 올리면 미리보기</span>
          <span className={cn('font-semibold', photos.length >= maxCount ? 'text-red-400' : '')}>
            {photos.length} / {maxCount}장
          </span>
        </div>
      )}
    </div>
  )
}
