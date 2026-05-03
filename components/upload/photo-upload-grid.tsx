'use client'

import { useState, useRef, useCallback } from 'react'
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
import { Plus, X, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PhotoItem {
  id: string       // 고유 ID (순서 추적용)
  file: File
  previewUrl: string
}

interface PhotoUploadGridProps {
  photos: PhotoItem[]
  maxCount: number              // 플랫폼 최대 장수 (Instagram=10, TikTok=35)
  onChange: (photos: PhotoItem[]) => void
}

// ── 개별 사진 썸네일 (드래그 가능) ──────────────────────────────
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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }, [])

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
        {/* 사진 */}
        <img
          src={photo.previewUrl}
          alt={`사진 ${index + 1}`}
          className="h-full w-full object-cover"
          draggable={false}
        />

        {/* 순서 번호 */}
        <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">
          {index + 1}
        </div>

        {/* 드래그 핸들 힌트 */}
        <div className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-white drop-shadow" />
        </div>

        {/* 삭제 버튼 */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          onPointerDown={(e) => e.stopPropagation()} // 드래그 이벤트 차단
          className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
        >
          <X className="h-3 w-3" />
        </button>

        {/* 어두운 오버레이 (호버 시) */}
        <div className={cn(
          'absolute inset-0 bg-black/10 transition-opacity',
          hovered ? 'opacity-100' : 'opacity-0'
        )} />
      </div>

      {/* 즉시 확대 미리보기 (마우스 위치 따라다님) */}
      {hovered && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: mousePos.x + 20,
            top: mousePos.y - 220,
            // 화면 오른쪽 넘어가면 왼쪽에 표시
            transform: mousePos.x > window.innerWidth - 420
              ? 'translateX(calc(-100% - 40px))'
              : 'none',
          }}
        >
          <div className="rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl shadow-black/50">
            <img
              src={photo.previewUrl}
              alt="미리보기"
              className="h-96 w-96 object-cover"
              draggable={false}
            />
          </div>
          <p className="mt-1 text-center text-[10px] text-white/80 drop-shadow">
            {(photo.file.size / (1024 * 1024)).toFixed(1)} MB · {photo.file.name}
          </p>
        </div>
      )}
    </>
  )
}

// ── 드래그 중 오버레이용 (고스트) ──────────────────────────────
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
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // 5px 이상 움직여야 드래그 시작
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  )

  // 파일 추가
  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files)
    const imageFiles = arr.filter(f => f.type.startsWith('image/'))
    const remaining = maxCount - photos.length
    const toAdd = imageFiles.slice(0, remaining)

    const newPhotos: PhotoItem[] = toAdd.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    onChange([...photos, ...newPhotos])
  }, [photos, maxCount, onChange])

  // 파일 input 변경
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = '' // 같은 파일 재선택 허용
  }

  // 드래그앤드롭으로 파일 추가 (외부에서)
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  // 사진 삭제
  const removePhoto = (id: string) => {
    const photo = photos.find(p => p.id === id)
    if (photo) URL.revokeObjectURL(photo.previewUrl)
    onChange(photos.filter(p => p.id !== id))
  }

  // 순서 변경 (드래그 끝)
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = photos.findIndex(p => p.id === active.id)
    const newIndex = photos.findIndex(p => p.id === over.id)
    onChange(arrayMove(photos, oldIndex, newIndex))
  }

  const activePhoto = activeId ? photos.find(p => p.id === activeId) : null
  const canAddMore = photos.length < maxCount

  return (
    <div>
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

            {/* + 추가 버튼 */}
            {canAddMore && (
              <label
                className={cn(
                  'aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors',
                  isDraggingOver
                    ? 'border-brand bg-brand/10'
                    : 'border-[var(--card-border)] hover:border-brand hover:bg-brand/5'
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true) }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleFileDrop}
                htmlFor="photo-file-input"
              >
                <Plus className="h-6 w-6 text-[var(--muted)]" />
                <span className="mt-1 text-[10px] text-[var(--muted)]">추가</span>
              </label>
            )}
          </div>
        </SortableContext>

        {/* 드래그 중 고스트 이미지 */}
        <DragOverlay>
          {activePhoto && <DragGhost photo={activePhoto} />}
        </DragOverlay>
      </DndContext>

      {/* 숨겨진 파일 input */}
      <input
        id="photo-file-input"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {/* 안내 */}
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>
          드래그로 순서 변경 · 마우스 올리면 미리보기
        </span>
        <span className={cn(
          'font-semibold',
          photos.length >= maxCount ? 'text-red-400' : 'text-[var(--muted)]'
        )}>
          {photos.length} / {maxCount}장
        </span>
      </div>
    </div>
  )
}
