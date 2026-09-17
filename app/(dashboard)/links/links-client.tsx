'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  Copy,
  ExternalLink,
  Hash,
  Link2,
  PackageSearch,
  Pencil,
  RefreshCw,
  Search,
  Settings2,
  Store,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import {
  HOTDEAL_CATEGORIES,
  PLATFORM_LABEL,
  shortPath,
  type LinkSettings,
  type TrackedLink,
} from '@/lib/links'
import type { ShoppingProduct } from '@/lib/shopping'
import { isHamiOnline, requestHamiLinkPreview } from '@/lib/threads-publish'
import { cn } from '@/lib/utils'
import { ProfilePanel } from './profile-panel'

type TabId = 'convert' | 'find' | 'mine' | 'channel' | 'profile' | 'hotdeal'
type FindSub = 'coupang' | 'toss' | 'compare'
type MineSort = 'clicks' | 'newest'

const TABS: { id: TabId; label: string; icon: typeof Link2 }[] = [
  { id: 'convert', label: '링크 변환', icon: Link2 },
  { id: 'find', label: '상품찾기', icon: PackageSearch },
  { id: 'mine', label: '내 링크', icon: Hash },
  { id: 'channel', label: '채널 실적', icon: BarChart3 },
  { id: 'profile', label: '프로필 페이지', icon: UserRound },
  { id: 'hotdeal', label: '핫딜 사이트', icon: Store },
]

function origin() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('이미지 읽기 실패'))
    reader.readAsDataURL(file)
  })
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('이미지를 불러오지 못했어요'))
    img.src = src
  })
}

const CROP_EXPORT = 1080
const CROP_VIEW = 320
/** Movable 1:1 registration frame size inside the editor viewport */
const CROP_FRAME = Math.round(CROP_VIEW * 0.72)

async function exportSquareCrop(
  src: string,
  zoom: number,
  offsetX: number,
  offsetY: number,
  viewSize: number,
  frameSize: number,
  frameX: number,
  frameY: number
): Promise<string> {
  const img = await loadHtmlImage(src)
  const nw = img.naturalWidth || img.width
  const nh = img.naturalHeight || img.height
  if (!nw || !nh) throw new Error('이미지 크기를 알 수 없어요')

  const cover = viewSize / Math.min(nw, nh)
  const scale = cover * Math.max(1, zoom)
  const dw = nw * scale
  const dh = nh * scale
  const dx = (viewSize - dw) / 2 + offsetX
  const dy = (viewSize - dh) / 2 + offsetY

  const canvas = document.createElement('canvas')
  canvas.width = CROP_EXPORT
  canvas.height = CROP_EXPORT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas를 사용할 수 없어요')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, CROP_EXPORT, CROP_EXPORT)
  const k = CROP_EXPORT / frameSize
  // Draw only the region under the yellow frame into the export canvas
  ctx.drawImage(img, (dx - frameX) * k, (dy - frameY) * k, dw * k, dh * k)

  let quality = 0.88
  let out = canvas.toDataURL('image/jpeg', quality)
  while (out.length > 900_000 && quality > 0.45) {
    quality -= 0.08
    out = canvas.toDataURL('image/jpeg', quality)
  }
  if (out.length > 1_400_000) throw new Error('이미지가 너무 커요. 조금 더 축소해 주세요')
  return out
}

/** Inline 1:1 crop — drag the yellow frame to choose the registered area. */
function InlineOgCrop({
  src,
  onCropped,
}: {
  src: string
  onCropped: (dataUrl: string) => void
}) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [frame, setFrame] = useState({
    x: (CROP_VIEW - CROP_FRAME) / 2,
    y: (CROP_VIEW - CROP_FRAME) / 2,
  })
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{
    mode: 'frame' | 'image'
    x: number
    y: number
    ox: number
    oy: number
    fx: number
    fy: number
  } | null>(null)
  const exportTimer = useRef<number | null>(null)
  const view = CROP_VIEW
  const frameSize = CROP_FRAME
  const pad = view - frameSize

  useEffect(() => {
    let alive = true
    void loadHtmlImage(src)
      .then((img) => {
        if (!alive) return
        setNatural({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height })
        setZoom(1)
        setOffset({ x: 0, y: 0 })
        setFrame({ x: pad / 2, y: pad / 2 })
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [src, pad])

  const cover = natural ? view / Math.min(natural.w, natural.h) : 1
  const scale = cover * zoom
  const dw = natural ? natural.w * scale : view
  const dh = natural ? natural.h * scale : view

  function clampOffset(x: number, y: number, z: number) {
    if (!natural) return { x: 0, y: 0 }
    const s = cover * Math.max(1, z)
    const w = natural.w * s
    const h = natural.h * s
    const maxX = Math.max(0, (w - view) / 2)
    const maxY = Math.max(0, (h - view) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    }
  }

  function clampFrame(x: number, y: number) {
    return {
      x: Math.min(pad, Math.max(0, x)),
      y: Math.min(pad, Math.max(0, y)),
    }
  }

  const scheduleExport = useCallback(
    (z: number, ox: number, oy: number, fx: number, fy: number) => {
      if (exportTimer.current) window.clearTimeout(exportTimer.current)
      exportTimer.current = window.setTimeout(() => {
        void exportSquareCrop(src, z, ox, oy, view, frameSize, fx, fy)
          .then(onCropped)
          .catch(() => undefined)
      }, 120)
    },
    [onCropped, src, view, frameSize]
  )

  useEffect(() => {
    if (!natural) return
    scheduleExport(zoom, offset.x, offset.y, frame.x, frame.y)
  }, [natural, zoom, offset.x, offset.y, frame.x, frame.y, scheduleExport])

  useEffect(() => {
    return () => {
      if (exportTimer.current) window.clearTimeout(exportTimer.current)
    }
  }, [])

  function applyZoom(next: number) {
    const z = Math.min(3, Math.max(1, next))
    setZoom(z)
    setOffset((o) => clampOffset(o.x, o.y, z))
  }

  function resetCrop() {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setFrame({ x: pad / 2, y: pad / 2 })
  }

  function hitFrame(clientX: number, clientY: number, el: HTMLElement) {
    const r = el.getBoundingClientRect()
    const x = clientX - r.left
    const y = clientY - r.top
    return x >= frame.x && x <= frame.x + frameSize && y >= frame.y && y <= frame.y + frameSize
  }

  return (
    <div className="space-y-2">
      <p className="rounded-lg bg-black/70 px-3 py-1.5 text-center text-[11px] font-medium text-[var(--gold)] ring-1 ring-[var(--gold)]/35">
        노란 테두리를 드래그해서 등록 영역을 정하세요
      </p>
      <div
        className="relative mx-auto touch-none overflow-hidden rounded-2xl border border-dashed border-white/20 bg-black"
        style={{
          width: view,
          height: view,
          maxWidth: '100%',
          cursor: dragging ? 'grabbing' : 'grab',
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          const mode = hitFrame(e.clientX, e.clientY, e.currentTarget) ? 'frame' : 'image'
          setDragging(true)
          dragRef.current = {
            mode,
            x: e.clientX,
            y: e.clientY,
            ox: offset.x,
            oy: offset.y,
            fx: frame.x,
            fy: frame.y,
          }
        }}
        onPointerMove={(e) => {
          const d = dragRef.current
          if (!d) return
          const dx = e.clientX - d.x
          const dy = e.clientY - d.y
          if (d.mode === 'frame') {
            setFrame(clampFrame(d.fx + dx, d.fy + dy))
          } else {
            setOffset(clampOffset(d.ox + dx, d.oy + dy, zoom))
          }
        }}
        onPointerUp={() => {
          dragRef.current = null
          setDragging(false)
        }}
        onPointerCancel={() => {
          dragRef.current = null
          setDragging(false)
        }}
        onWheel={(e) => {
          e.preventDefault()
          applyZoom(zoom + (e.deltaY > 0 ? -0.08 : 0.08))
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={{
            width: dw,
            height: dh,
            left: (view - dw) / 2 + offset.x,
            top: (view - dh) / 2 + offset.y,
          }}
        />

        {/* Movable 1:1 registration frame */}
        <div
          className="absolute rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ring-[3px] ring-[var(--gold)]"
          style={{
            left: frame.x,
            top: frame.y,
            width: frameSize,
            height: frameSize,
            cursor: dragging ? 'grabbing' : 'move',
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => applyZoom(zoom - 0.12)}
          className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/15"
          aria-label="축소"
        >
          −
        </button>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => applyZoom(Number(e.target.value))}
          className="min-w-0 flex-1 accent-[var(--accent)]"
        />
        <button
          type="button"
          onClick={() => applyZoom(zoom + 0.12)}
          className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/15"
          aria-label="확대"
        >
          +
        </button>
        <span className="w-10 shrink-0 text-right text-[11px] text-white/40">{zoom.toFixed(1)}x</span>
        <button
          type="button"
          onClick={resetCrop}
          className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:bg-white/15"
        >
          초기화
        </button>
      </div>
      <p className="text-[11px] text-white/35">
        노란 테두리 드래그 = 등록 영역 · 바깥 드래그 = 이미지 이동 · 휠/+− = 확대·축소
      </p>
    </div>
  )
}

function ImageDropZone({
  source,
  preview,
  onFile,
  onClear,
  onCropped,
  emptyHint = '이미지를 드래그하거나 클릭해서 업로드',
}: {
  /** Original image for pan/zoom editing */
  source: string | null
  /** Final 1:1 crop (sidebar sync) */
  preview: string | null
  onFile: (file: File) => void | Promise<void>
  onClear?: () => void
  onCropped?: (dataUrl: string) => void
  emptyHint?: string
}) {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function takeFile(file: File | null | undefined) {
    if (!file) return
    void onFile(file)
  }

  if (source && onCropped) {
    return (
      <div className="space-y-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-3">
        <InlineOgCrop src={source} onCropped={onCropped} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/15"
          >
            다른 이미지 선택
          </button>
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg px-3 py-1.5 text-xs text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-300"
            >
              이미지 제거
            </button>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              takeFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(false)
          takeFile(e.dataTransfer.files?.[0])
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 transition',
          dragOver
            ? 'border-[var(--accent)] bg-[var(--accent)]/15'
            : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="aspect-square max-h-44 w-auto max-w-full rounded-xl object-cover"
          />
        ) : (
          <>
            <span className="text-2xl opacity-50">🖼️</span>
            <span className="text-center text-xs text-white/50">
              {dragOver ? '여기에 놓으세요' : emptyHint}
            </span>
            <span className="text-[11px] text-white/30">가로·세로 → 1:1 테두리로 조절 · PNG · JPG · WEBP</span>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            takeFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </label>
    </div>
  )
}

export function LinksClient() {
  const [tab, setTab] = useState<TabId>('convert')
  const [settings, setSettings] = useState<LinkSettings | null>(null)
  const [links, setLinks] = useState<TrackedLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [editing, setEditing] = useState<TrackedLink | null>(null)

  const ping = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2200)
  }, [])

  const upsertLink = useCallback((link: TrackedLink) => {
    setLinks((prev) => {
      const rest = prev.filter((x) => x.id !== link.id)
      return [link, ...rest].sort((a, b) => b.created_at.localeCompare(a.created_at))
    })
  }, [])

  const removeLinksLocal = useCallback((ids: string[]) => {
    const set = new Set(ids)
    setLinks((prev) => prev.filter((x) => !set.has(x.id)))
  }, [])

  async function deleteLinks(ids: string[]) {
    if (!ids.length) return
    const res = await fetch('/api/links', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || '삭제 실패')
    removeLinksLocal(ids)
    setEditing((cur) => (cur && ids.includes(cur.id) ? null : cur))
  }

  async function deleteAllLinks() {
    const res = await fetch('/api/links', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || '삭제 실패')
    setLinks([])
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/links', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '불러오기 실패')
      setSettings(data.settings)
      setLinks(data.links ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function patchSettings(body: Record<string, unknown>) {
    const res = await fetch('/api/links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '저장 실패')
    setSettings(data.settings)
    return data.settings as LinkSettings
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      ping('복사했어요')
    } catch {
      ping('복사 실패')
    }
  }

  if (loading && !settings) {
    return <div className="py-16 text-center text-sm text-white/40">불러오는 중…</div>
  }

  if (error && !settings) {
    return (
      <div className="space-y-3 py-10 text-center">
        <p className="text-sm text-rose-300">{error}</p>
        <p className="text-xs text-white/40">
          Supabase에 <code className="text-white/60">supabase/tracked_links.sql</code> 을 실행했는지 확인해 주세요.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[920px] space-y-5">
      <div className="flex flex-wrap gap-1.5 border-b border-white/10 pb-3">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition',
                active
                  ? 'bg-[var(--accent)] text-white shadow-[0_0_0_1px_rgba(139,92,246,0.5)]'
                  : 'text-white/55 hover:bg-white/5 hover:text-white/80'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'convert' && settings && (
        <ConvertPanel
          settings={settings}
          links={links}
          onCreated={(link) => {
            upsertLink(link)
            ping('링크가 만들어졌어요')
          }}
          onEdit={setEditing}
          onDelete={async (id) => {
            await deleteLinks([id])
            ping('링크를 삭제했어요')
          }}
          onPrefixSave={async (prefix) => {
            await patchSettings({ prefix })
            await load()
            ping('접두사를 저장했어요')
          }}
          copyText={copyText}
        />
      )}

      {tab === 'find' && (
        <FindPanel
          onUseUrl={(url, title, image) => {
            setTab('convert')
            window.dispatchEvent(
              new CustomEvent('mostem-links-prefill', { detail: { url, title, image } })
            )
          }}
        />
      )}

      {tab === 'mine' && settings && (
        <MinePanel
          links={links}
          settings={settings}
          copyText={copyText}
          onRefresh={() => void load()}
          onEdit={setEditing}
          onDeleteOne={async (id) => {
            await deleteLinks([id])
            ping('링크를 삭제했어요')
          }}
          onDeleteMany={async (ids) => {
            await deleteLinks(ids)
            ping(`${ids.length}개 링크를 삭제했어요`)
          }}
          onDeleteAll={async () => {
            await deleteAllLinks()
            ping('링크를 모두 삭제했어요')
          }}
        />
      )}

      {tab === 'channel' && settings && (
        <ChannelPanel links={links} settings={settings} onRefresh={() => void load()} />
      )}

      {tab === 'profile' && settings && (
        <ProfilePanel
          settings={settings}
          links={links}
          onSave={async (patch) => {
            const next = await patchSettings(patch)
            ping('프로필을 저장했어요')
            return next
          }}
          onCopy={(text) => void copyText(text)}
        />
      )}

      {tab === 'hotdeal' && settings && (
        <HotdealPanel
          settings={settings}
          onSave={async (patch) => {
            await patchSettings(patch)
            ping('핫딜 설정을 저장했어요')
          }}
        />
      )}

      {editing ? (
        <EditLinkModal
          link={editing}
          onClose={() => setEditing(null)}
          onSaved={(link) => {
            upsertLink(link)
            setEditing(null)
            ping('링크를 수정했어요')
          }}
          onDeleted={async (id) => {
            await deleteLinks([id])
            setEditing(null)
            ping('링크를 삭제했어요')
          }}
        />
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  )
}

function EditLinkModal({
  link,
  onClose,
  onSaved,
  onDeleted,
}: {
  link: TrackedLink
  onClose: () => void
  onSaved: (link: TrackedLink) => void
  onDeleted: (id: string) => Promise<void>
}) {
  const [title, setTitle] = useState(link.title || '')
  const [url, setUrl] = useState(link.destination_url || '')
  const [ogPreview, setOgPreview] = useState<string | null>(link.og_image_url || null)
  const [cropSource, setCropSource] = useState<string | null>(link.og_image_url || null)
  const [clearImage, setClearImage] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function onPickImage(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErr('이미지 파일만 올릴 수 있어요')
      return
    }
    if (file.size > 4_000_000) {
      setErr('원본은 4MB 이하로 올려 주세요 (저장 시 1:1로 압축됩니다)')
      return
    }
    setCropSource(await fileToDataUrl(file))
    setErr('')
  }

  async function save() {
    setBusy(true)
    setErr('')
    try {
      const body: Record<string, unknown> = {
        title,
        url,
      }
      if (clearImage) body.clearImage = true
      else if (ogPreview && ogPreview !== link.og_image_url) body.ogImageUrl = ogPreview
      else if (ogPreview && !link.og_image_url) body.ogImageUrl = ogPreview

      const res = await fetch(`/api/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '수정 실패')
      onSaved(data.link as TrackedLink)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '수정 실패')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm('이 링크를 삭제할까요?')) return
    setBusy(true)
    setErr('')
    try {
      await onDeleted(link.id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '삭제 실패')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#16161b] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">링크 편집</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-white/50 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 font-mono text-[11px] text-white/40">
          {origin()}
          {shortPath(link.prefix, link.code)}
        </p>

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs text-white/55">제목</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]/60"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs text-white/55">원본 링크</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]/60"
            />
          </label>

          <div className="space-y-1.5">
            <span className="text-xs text-white/55">공유 카드 이미지 (1:1)</span>
            <ImageDropZone
              source={!clearImage ? cropSource : null}
              preview={ogPreview && !clearImage ? ogPreview : null}
              emptyHint="올리면 테두리 안에서 위치·확대를 고를 수 있어요"
              onFile={(file) => void onPickImage(file)}
              onCropped={(dataUrl) => {
                setOgPreview(dataUrl)
                setClearImage(false)
              }}
              onClear={() => {
                setOgPreview(null)
                setClearImage(true)
                setCropSource(null)
              }}
            />
          </div>

          {err ? <p className="text-sm text-rose-300">{err}</p> : null}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? '저장 중…' : '저장'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="rounded-xl bg-rose-500/15 px-4 py-2.5 text-sm font-medium text-rose-300 disabled:opacity-40"
            >
              삭제
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white/70"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConvertPanel({
  settings,
  links,
  onCreated,
  onEdit,
  onDelete,
  onPrefixSave,
  copyText,
}: {
  settings: LinkSettings
  links: TrackedLink[]
  onCreated: (link: TrackedLink) => void
  onEdit: (link: TrackedLink) => void
  onDelete: (id: string) => Promise<void>
  onPrefixSave: (prefix: string) => Promise<void>
  copyText: (t: string) => void
}) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [ogPreview, setOgPreview] = useState<string | null>(null)
  const [cropSource, setCropSource] = useState<string | null>(null)
  const [prefixDraft, setPrefixDraft] = useState(settings.prefix)
  const [busy, setBusy] = useState(false)
  const [fetchingThumb, setFetchingThumb] = useState(false)
  const [thumbHint, setThumbHint] = useState('')
  const [err, setErr] = useState('')
  const [last, setLast] = useState<TrackedLink | null>(null)
  const titleTouched = useRef(false)
  const imageTouched = useRef(false)
  const previewSeq = useRef(0)

  useEffect(() => {
    setPrefixDraft(settings.prefix)
  }, [settings.prefix])

  async function applyRemoteImage(imageUrl: string) {
    const res = await fetch('/api/links/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || typeof data.imageDataUrl !== 'string') return false
    setCropSource(data.imageDataUrl)
    setThumbHint('')
    setErr('')
    return true
  }

  async function fetchPreviewForUrl(pageUrl: string) {
    const seq = ++previewSeq.current
    setFetchingThumb(true)
    setThumbHint('')
    try {
      const res = await fetch('/api/links/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: pageUrl }),
      })
      const data = await res.json().catch(() => ({}))
      if (seq !== previewSeq.current) return

      if (res.ok) {
        if (!titleTouched.current && typeof data.title === 'string' && data.title.trim()) {
          setTitle(data.title.trim())
        }
        if (!imageTouched.current && typeof data.imageDataUrl === 'string') {
          setCropSource(data.imageDataUrl)
          setThumbHint('')
          return
        }
        if (!imageTouched.current && data.partial) {
          setThumbHint('제목은 가져왔어요. 썸네일은 직접 올려 주세요.')
        }
      }

      // Coupang (and similar) block server scrapes — try hami extension tab scrape
      const host = (() => {
        try {
          return new URL(pageUrl).hostname.toLowerCase()
        } catch {
          return ''
        }
      })()
      const needsHami = host.includes('coupang') || !res.ok || !data.imageDataUrl
      if (!needsHami || imageTouched.current || !isHamiOnline()) {
        if (!res.ok && typeof data.error === 'string' && data.error) setThumbHint(data.error)
        return
      }

      setThumbHint('하미로 상품 썸네일 불러오는 중…')
      const hami = await requestHamiLinkPreview(pageUrl)
      if (seq !== previewSeq.current) return
      if (!hami.ok) {
        setThumbHint(
          typeof data.error === 'string' && data.error
            ? data.error
            : '자동 썸네일을 못 가져왔어요. 상품찾기에서 고르거나 이미지를 직접 올려 주세요.'
        )
        return
      }
      if (!titleTouched.current && hami.title?.trim()) setTitle(hami.title.trim())
      if (!imageTouched.current && hami.imageUrl) {
        const ok = await applyRemoteImage(hami.imageUrl)
        if (seq !== previewSeq.current) return
        if (ok) setThumbHint('')
        else setThumbHint('이미지는 찾았지만 불러오지 못했어요. 직접 올려 주세요.')
      }
    } finally {
      if (seq === previewSeq.current) setFetchingThumb(false)
    }
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ url: string; title?: string; image?: string }>).detail
      if (!detail?.url) return
      titleTouched.current = Boolean(detail.title)
      imageTouched.current = false
      setUrl(detail.url)
      if (detail.title) setTitle(detail.title)
      if (detail.image) {
        imageTouched.current = true
        void applyRemoteImage(detail.image).then((ok) => {
          if (!ok) {
            imageTouched.current = false
            void fetchPreviewForUrl(detail.url)
          }
        })
      } else {
        void fetchPreviewForUrl(detail.url)
      }
    }
    window.addEventListener('mostem-links-prefill', handler)
    return () => window.removeEventListener('mostem-links-prefill', handler)
  }, [])

  useEffect(() => {
    const trimmed = url.trim()
    if (!/^https?:\/\//i.test(trimmed)) return
    const timer = window.setTimeout(() => {
      if (imageTouched.current && titleTouched.current) return
      void fetchPreviewForUrl(trimmed)
    }, 700)
    return () => window.clearTimeout(timer)
  }, [url])

  async function onPickImage(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErr('이미지 파일만 올릴 수 있어요')
      return
    }
    if (file.size > 4_000_000) {
      setErr('원본은 4MB 이하로 올려 주세요 (저장 시 1:1로 압축됩니다)')
      return
    }
    imageTouched.current = true
    setCropSource(await fileToDataUrl(file))
    setErr('')
  }

  async function convert() {
    setBusy(true)
    setErr('')
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          title: title || undefined,
          ogImageUrl: ogPreview,
          channel: settings.channel_id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '변환 실패')
      setLast(data.link)
      onCreated(data.link as TrackedLink)
      setUrl('')
      setTitle('')
      setOgPreview(null)
      setCropSource(null)
      titleTouched.current = false
      imageTouched.current = false
    } catch (e) {
      setErr(e instanceof Error ? e.message : '변환 실패')
    } finally {
      setBusy(false)
    }
  }

  const recent = links.slice(0, 5)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
        <div>
          <h2 className="text-lg font-semibold">링크 만들기</h2>
          <p className="mt-1 text-sm text-white/45">
            쿠팡·토스·네이버 URL을 Mostem 단축 링크로 바꿔 클릭을 추적해요. 최종 이동은 원본(파트너스) 주소 그대로입니다.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200/90">
          수수료는 100% 본인 몫입니다. Mostem은 중간에서 클릭만 기록합니다.
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-white/55">링크 붙여넣기</span>
          <input
            value={url}
            onChange={(e) => {
              imageTouched.current = false
              titleTouched.current = false
              setUrl(e.target.value)
            }}
            placeholder="https://www.coupang.com/vp/products/..."
            className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]/60"
          />
          {fetchingThumb ? (
            <p className="text-[11px] text-white/40">썸네일·제목 불러오는 중…</p>
          ) : thumbHint ? (
            <p className="text-[11px] text-amber-200/80">{thumbHint}</p>
          ) : (
            <p className="text-[11px] text-white/30">붙여넣으면 상품 썸네일·제목을 자동으로 가져와요</p>
          )}
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-white/55">링크 제목</span>
          <input
            value={title}
            onChange={(e) => {
              titleTouched.current = true
              setTitle(e.target.value)
            }}
            placeholder="예: 쿠팡 추천 상품"
            className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]/60"
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-white/55">공유 카드 이미지 (1:1)</span>
          <ImageDropZone
            source={cropSource}
            preview={ogPreview}
            emptyHint="올리면 테두리 안에서 위치·확대를 고를 수 있어요"
            onFile={(file) => void onPickImage(file)}
            onCropped={setOgPreview}
            onClear={() => {
              imageTouched.current = true
              setOgPreview(null)
              setCropSource(null)
            }}
          />
        </div>

        {err ? <p className="text-sm text-rose-300">{err}</p> : null}

        <button
          type="button"
          disabled={busy || !url.trim()}
          onClick={() => void convert()}
          className="w-full rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto"
        >
          {busy ? '변환 중…' : '변환하기'}
        </button>

        {last ? (
          <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4">
            <p className="text-xs text-white/50">단축 링크</p>
            <p className="mt-1 break-all font-mono text-sm text-[var(--gold)]">
              {origin()}
              {shortPath(last.prefix, last.code)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyText(`${origin()}${shortPath(last.prefix, last.code)}`)}
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs"
              >
                <Copy className="h-3.5 w-3.5" /> 복사
              </button>
              <button
                type="button"
                onClick={() => onEdit(last)}
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs"
              >
                <Pencil className="h-3.5 w-3.5" /> 편집
              </button>
              <a
                href={last.destination_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" /> 원본
              </a>
              <button
                type="button"
                onClick={() => {
                  if (!confirm('이 링크를 삭제할까요?')) return
                  void onDelete(last.id)
                    .then(() => setLast(null))
                    .catch((e) => alert(e instanceof Error ? e.message : '삭제 실패'))
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" /> 삭제
              </button>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">최근 변환</h3>
            <span className="text-xs text-white/35">{recent.length}개</span>
          </div>
          {recent.length === 0 ? (
            <p className="text-xs text-white/35">아직 변환한 링크가 없어요</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {l.og_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.og_image_url} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[10px] text-white/30">
                        없음
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm">{l.title}</p>
                      <p className="font-mono text-[11px] text-white/40">
                        /{l.prefix}/{l.code} · {l.click_count}클릭
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(l)}
                      className="rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/10"
                    >
                      편집
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(`${origin()}${shortPath(l.prefix, l.code)}`)}
                      className="rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/10"
                    >
                      복사
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm('이 링크를 삭제할까요?')) return
                        void onDelete(l.id).catch((e) =>
                          alert(e instanceof Error ? e.message : '삭제 실패')
                        )
                      }}
                      className="rounded-lg bg-rose-500 px-2 py-1 text-xs font-bold text-white hover:bg-rose-400"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="mb-3 text-sm font-medium">미리보기</h3>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
            <div
              className="relative w-full overflow-hidden bg-black"
              style={{ aspectRatio: '1 / 1' }}
            >
              {ogPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ogPreview}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-xs text-white/35">
                  <span className="text-2xl opacity-40">🖼️</span>
                  1:1 비율로 보여집니다
                </div>
              )}
            </div>
            <div className="border-t border-white/10 px-3 py-2.5">
              <p className="truncate text-sm font-medium text-white/85">{title.trim() || '링크 제목'}</p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-white/35">
                mostem.kr/l/{prefixDraft}/…
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Settings2 className="h-4 w-4 text-[var(--accent)]" />
            단축 주소 설정
          </div>
          <p className="text-xs text-white/40">
            공개 주소: <span className="font-mono text-white/60">/l/{prefixDraft}/코드</span>
          </p>
          <label className="block space-y-1.5">
            <span className="text-xs text-white/50">접두사</span>
            <div className="flex gap-2">
              <input
                value={prefixDraft}
                onChange={(e) => setPrefixDraft(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12))}
                className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--accent)]/60"
              />
              <button
                type="button"
                onClick={() => void onPrefixSave(prefixDraft)}
                className="shrink-0 rounded-xl bg-white/10 px-3 text-xs font-medium hover:bg-white/15"
              >
                저장
              </button>
            </div>
          </label>
        </div>
      </aside>
    </div>
  )
}

function FindPanel({ onUseUrl }: { onUseUrl: (url: string, title: string, image?: string) => void }) {
  const [sub, setSub] = useState<FindSub>('coupang')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [products, setProducts] = useState<ShoppingProduct[]>([])
  const [note, setNote] = useState('')
  const [searchUrl, setSearchUrl] = useState('')
  const [compareCoupang, setCompareCoupang] = useState<ShoppingProduct[]>([])
  const [compareNote, setCompareNote] = useState('')

  async function runSearch(source: 'coupang' | 'toss') {
    setBusy(true)
    setNote('')
    setSearchUrl('')
    try {
      const res = await fetch(`/api/links/search?q=${encodeURIComponent(q)}&source=${source}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '검색 실패')
      setProducts(data.products ?? [])
      setNote(data.note || '')
      setSearchUrl(data.searchUrl || '')
    } catch (e) {
      setNote(e instanceof Error ? e.message : '검색 실패')
      setProducts([])
    } finally {
      setBusy(false)
    }
  }

  async function runCompare() {
    setBusy(true)
    setCompareNote('')
    try {
      const res = await fetch(`/api/links/search?q=${encodeURIComponent(q)}&source=coupang`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '비교 실패')
      setCompareCoupang(data.products ?? [])
      setCompareNote(
        data.note ||
          '토스 쪽은 쉐어링크 키 연동 전까지 쿠팡 결과만 보여 드려요. 같은 검색어로 가격을 나란히 비교하는 화면입니다.'
      )
    } catch (e) {
      setCompareNote(e instanceof Error ? e.message : '비교 실패')
      setCompareCoupang([])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">상품찾기</h2>
        <p className="mt-1 text-sm text-white/45">홍보할 상품을 찾고, 바로 링크 변환으로 넘길 수 있어요.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['coupang', '쿠팡'],
            ['toss', '토스'],
            ['compare', '가격비교'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSub(id)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium',
              sub === id ? 'bg-[var(--gold)] text-black' : 'bg-white/5 text-white/55 hover:bg-white/10'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {sub === 'compare' ? (
        <div className="space-y-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Hash className="h-4 w-4 text-[var(--accent)]" /> 가격비교
            </h3>
            <p className="mt-1 text-sm text-white/45">같은 검색어로 쿠팡·토스 가격을 나란히 비교해요.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void runCompare()}
              placeholder="예: 무선청소기"
              className="flex-1 rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]/60"
            />
            <button
              type="button"
              disabled={busy || !q.trim()}
              onClick={() => void runCompare()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Search className="h-4 w-4" /> 비교하기
            </button>
          </div>
          {compareNote ? <p className="text-xs text-white/40">{compareNote}</p> : null}
          {!compareCoupang.length && !busy ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-12 text-center text-sm text-white/40">
              검색어를 입력해 비교해 보세요
              <p className="mt-1 text-xs text-white/30">같은 상품이 쿠팡·토스 어디가 더 싼지 바로 보여드려요.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <ProductColumn
                title="쿠팡"
                products={compareCoupang}
                onUse={onUseUrl}
              />
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/40">
                <p className="font-medium text-white/60">토스</p>
                <p className="mt-2 text-xs leading-relaxed">
                  토스 쉐어링크 키가 아직 연결되지 않았어요. 설정에서 연결하면 같은 검색어로 토스 가격이 여기에 표시됩니다.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void runSearch(sub)}
              placeholder={sub === 'coupang' ? '쿠팡 상품 검색' : '토스 상품 검색'}
              className="flex-1 rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]/60"
            />
            <button
              type="button"
              disabled={busy || !q.trim()}
              onClick={() => void runSearch(sub)}
              className="rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              검색
            </button>
          </div>
          {note ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/45">
              {note}{' '}
              {searchUrl ? (
                <a href={searchUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] underline">
                  검색 열기
                </a>
              ) : null}
            </div>
          ) : null}
          <ProductColumn title={sub === 'coupang' ? '쿠팡' : '토스'} products={products} onUse={onUseUrl} />
        </div>
      )}
    </div>
  )
}

function ProductColumn({
  title,
  products,
  onUse,
}: {
  title: string
  products: ShoppingProduct[]
  onUse: (url: string, title: string, image?: string) => void
}) {
  if (!products.length) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-white/50">{title}</p>
      <ul className="space-y-2">
        {products.map((p) => (
          <li
            key={`${p.rank}-${p.title}`}
            className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm">{p.title}</p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--gold)]">{p.priceText}</p>
              <div className="mt-2 flex gap-2">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/70"
                >
                  열기
                </a>
                <button
                  type="button"
                  onClick={() => onUse(p.url, p.title, p.image || undefined)}
                  className="rounded-lg bg-[var(--accent)]/80 px-2 py-1 text-[11px] text-white"
                >
                  링크로 변환
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MinePanel({
  links,
  settings,
  copyText,
  onRefresh,
  onEdit,
  onDeleteOne,
  onDeleteMany,
  onDeleteAll,
}: {
  links: TrackedLink[]
  settings: LinkSettings
  copyText: (t: string) => void
  onRefresh: () => void
  onEdit: (link: TrackedLink) => void
  onDeleteOne: (id: string) => Promise<void>
  onDeleteMany: (ids: string[]) => Promise<void>
  onDeleteAll: () => Promise<void>
}) {
  const [sort, setSort] = useState<MineSort>('clicks')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const totalClicks = links.reduce((s, l) => s + (l.click_count || 0), 0)
  const sorted = useMemo(() => {
    const arr = [...links]
    if (sort === 'clicks') arr.sort((a, b) => b.click_count - a.click_count || b.created_at.localeCompare(a.created_at))
    else arr.sort((a, b) => b.created_at.localeCompare(a.created_at))
    return arr
  }, [links, sort])
  const topShare =
    totalClicks > 0 && sorted[0] ? Math.round((sorted[0].click_count / totalClicks) * 100) : null
  const withClicks = links.filter((l) => l.click_count > 0).length
  const coupangCount = links.filter((l) => l.platform === 'coupang').length
  const allSelected = sorted.length > 0 && selected.size === sorted.length

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(sorted.map((l) => l.id)))
  }

  async function runDeleteSelected() {
    const ids = [...selected]
    if (!ids.length) return
    if (!confirm(`선택한 ${ids.length}개 링크를 삭제할까요?`)) return
    setBusy(true)
    try {
      await onDeleteMany(ids)
      setSelected(new Set())
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패')
    } finally {
      setBusy(false)
    }
  }

  async function runDeleteAll() {
    if (!links.length) return
    if (!confirm(`만든 링크 ${links.length}개를 모두 삭제할까요? 되돌릴 수 없습니다.`)) return
    setBusy(true)
    try {
      await onDeleteAll()
      setSelected(new Set())
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">내 링크</h2>
          <p className="mt-1 text-sm text-white/45">클릭이 많은 순으로 정렬돼요. 막대 길이는 전체 클릭 대비 비중입니다.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white/60 hover:bg-white/10"
        >
          <RefreshCw className="h-3.5 w-3.5" /> 새로고침
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="만든 링크" value={`${links.length}개`} />
        <StatCard label="전체 클릭" value={`${totalClicks}회`} />
        <StatCard
          label="1위 링크 비중"
          value={topShare == null ? '—' : `${topShare}%`}
          hint={topShare == null ? '아직 클릭이 없어요' : undefined}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setSort('clicks')}
          className={cn('rounded-full px-3 py-1', sort === 'clicks' ? 'bg-[var(--accent)]' : 'bg-white/5 text-white/50')}
        >
          클릭 많은순
        </button>
        <button
          type="button"
          onClick={() => setSort('newest')}
          className={cn('rounded-full px-3 py-1', sort === 'newest' ? 'bg-[var(--accent)]' : 'bg-white/5 text-white/50')}
        >
          최신순
        </button>
        <span className="text-white/35">전체 ({links.length})</span>
        <span className="text-white/35">클릭 있음 ({withClicks})</span>
        <span className="text-white/35">쿠팡 ({coupangCount})</span>
      </div>

      {links.length > 0 ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-3">
          <p className="mb-2 text-xs font-semibold text-rose-200">링크 삭제</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-black/30 px-2.5 py-1.5 text-xs text-white/70">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="rounded border-white/20 bg-black/40"
              />
              전체 선택
            </label>
            <span className="text-[11px] text-white/40">선택 {selected.size}개</span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || selected.size === 0}
                onClick={() => void runDeleteSelected()}
                className="inline-flex items-center gap-1 rounded-xl bg-rose-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                선택 삭제
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runDeleteAll()}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-400/50 bg-black/40 px-3 py-2 text-xs font-bold text-rose-200 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                전체 삭제
              </button>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-white/40">
            ① 각 행의 「삭제」 ② 체크 후 「선택 삭제」 ③ 「전체 삭제」
          </p>
        </div>
      ) : null}

      <ul className="space-y-2">
        {sorted.map((l) => {
          const pct = totalClicks > 0 ? Math.max(2, Math.round((l.click_count / totalClicks) * 100)) : 0
          const checked = selected.has(l.id)
          return (
            <li key={l.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOne(l.id)}
                  className="shrink-0 rounded border-white/20 bg-black/40"
                  aria-label="선택"
                />
                {l.og_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.og_image_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-lg">
                    {l.platform === 'coupang' ? '🐧' : l.platform === 'toss' ? '💙' : '🔗'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.title || PLATFORM_LABEL[l.platform] || '링크'}</p>
                  <p className="font-mono text-[11px] text-white/40">
                    /{l.prefix}/{l.code} · {l.click_count}회
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEdit(l)}
                    className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white/60"
                  >
                    편집
                  </button>
                  <a
                    href={l.destination_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white/60"
                  >
                    원본
                  </a>
                  <button
                    type="button"
                    onClick={() => copyText(`${origin()}${shortPath(l.prefix, l.code)}`)}
                    className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white/60"
                  >
                    복사
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!confirm('이 링크를 삭제할까요?')) return
                      void onDeleteOne(l.id)
                        .then(() => {
                          setSelected((prev) => {
                            const next = new Set(prev)
                            next.delete(l.id)
                            return next
                          })
                        })
                        .catch((e) => alert(e instanceof Error ? e.message : '삭제 실패'))
                    }}
                    className="rounded-lg bg-rose-500 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </li>
          )
        })}
        {!sorted.length ? (
          <li className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-white/35">
            변환한 링크가 여기 쌓여요. 접두사: <span className="font-mono">{settings.prefix}</span>
          </li>
        ) : null}
      </ul>

      <p className="text-[11px] leading-relaxed text-white/30">
        클릭은 실시간으로 집계되며, 봇·미리보기 요청은 제외하려고 합니다. 쿠팡 주문·수익은 파트너스 리포트 기준이며 하루 이상
        지연될 수 있어요.
      </p>
    </div>
  )
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-white/30">{hint}</p> : null}
    </div>
  )
}

function ChannelPanel({
  links,
  settings,
  onRefresh,
}: {
  links: TrackedLink[]
  settings: LinkSettings
  onRefresh: () => void
}) {
  const byChannel = useMemo(() => {
    const map = new Map<string, { links: number; clicks: number }>()
    for (const l of links) {
      const key = l.channel || settings.channel_id || '기본값'
      const cur = map.get(key) || { links: 0, clicks: 0 }
      cur.links += 1
      cur.clicks += l.click_count || 0
      map.set(key, cur)
    }
    if (!map.size) map.set(settings.channel_id || '기본값', { links: 0, clicks: 0 })
    return Array.from(map.entries())
  }, [links, settings.channel_id])

  const totalClicks = links.reduce((s, l) => s + (l.click_count || 0), 0)
  const updated = new Date().toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">채널 실적</h2>
          <p className="mt-1 text-sm text-white/45">
            Mostem 유입 클릭과 쿠팡 클릭·주문·수익을 채널 ID 기준으로 비교해요. (쿠팡 리포트 연동은 준비 중)
          </p>
        </div>
        <div className="text-right text-xs text-white/40">
          <p>{updated} 업데이트</p>
          <button type="button" onClick={onRefresh} className="mt-1 text-[var(--accent)] hover:underline">
            새로고침
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Mostem 클릭" value={`${totalClicks}`} />
        <StatCard label="쿠팡 클릭" value="—" hint="구분 불가" />
        <StatCard label="주문" value="0건" />
        <StatCard label="수익" value="0원" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs text-white/45">
            <tr>
              <th className="px-4 py-3 font-medium">채널</th>
              <th className="px-4 py-3 font-medium">생성 링크</th>
              <th className="px-4 py-3 font-medium">Mostem 클릭</th>
              <th className="px-4 py-3 font-medium">쿠팡 클릭</th>
              <th className="px-4 py-3 font-medium">주문</th>
              <th className="px-4 py-3 font-medium">수익</th>
            </tr>
          </thead>
          <tbody>
            {byChannel.map(([name, row]) => (
              <tr key={name} className="border-t border-white/5">
                <td className="px-4 py-3">{name}</td>
                <td className="px-4 py-3">{row.links}개</td>
                <td className="px-4 py-3">{row.clicks}회</td>
                <td className="px-4 py-3 text-white/35">구분 불가</td>
                <td className="px-4 py-3 text-white/35">구분 불가</td>
                <td className="px-4 py-3 text-white/35">구분 불가</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-relaxed text-white/30">
        Mostem 클릭은 실시간입니다. 쿠팡 파트너스 리포트는 하루 이상 지연될 수 있으며, 채널 구분 연동이 되기 전에는 “구분
        불가”로 표시됩니다.
      </p>
    </div>
  )
}

function HotdealPanel({
  settings,
  onSave,
}: {
  settings: LinkSettings
  onSave: (patch: Record<string, unknown>) => Promise<void>
}) {
  const [slug, setSlug] = useState(settings.hotdeal_slug || '')
  const [name, setName] = useState(settings.hotdeal_name || '')
  const [intro, setIntro] = useState(settings.hotdeal_intro || '')
  const [cats, setCats] = useState<string[]>(settings.hotdeal_categories || [])
  const [theme, setTheme] = useState(settings.hotdeal_theme || 'mostem')
  const [bg, setBg] = useState(settings.hotdeal_bg || 'dark')
  const [published, setPublished] = useState(!!settings.hotdeal_published)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    setSlug(settings.hotdeal_slug || '')
    setName(settings.hotdeal_name || '')
    setIntro(settings.hotdeal_intro || '')
    setCats(settings.hotdeal_categories || [])
    setTheme(settings.hotdeal_theme || 'mostem')
    setBg(settings.hotdeal_bg || 'dark')
    setPublished(!!settings.hotdeal_published)
  }, [settings])

  function fillExample() {
    setSlug((s) => s || 'my-hotdeal')
    setName((n) => n || '오리네 핫딜')
    setIntro((i) => i || '매일 새벽에 골라 담는 진짜 특가')
  }

  function toggleCat(c: string) {
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  async function save(publish?: boolean) {
    setBusy(true)
    setErr('')
    try {
      const nextPublished = publish ?? published
      await onSave({
        hotdealSlug: slug || null,
        hotdealName: name || null,
        hotdealIntro: intro || null,
        hotdealCategories: cats,
        hotdealTheme: theme,
        hotdealBg: bg,
        hotdealPublished: nextPublished,
      })
      setPublished(nextPublished)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">핫딜 사이트</h2>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              published ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/45'
            )}
          >
            {published ? '공개' : '비공개'}
          </span>
        </div>
        {slug ? (
          <a href={`/s/${slug}`} target="_blank" rel="noreferrer" className="text-xs text-[var(--accent)] underline">
            사이트 보기
          </a>
        ) : null}
      </div>

      <div className="rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-4 py-3 text-sm">
        <p className="font-medium">핫딜 사이트 시작 가이드</p>
        <p className="mt-1 text-xs text-white/50">주소·이름만 정하면 쿠팡 베스트 상품이 매일 채워지는 특가 페이지를 만들 수 있어요. (약 5분)</p>
      </div>

      <section className="space-y-3 rounded-2xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">기본 정보</h3>
          <button type="button" onClick={fillExample} className="text-xs text-[var(--accent)] hover:underline">
            예시로 채우기
          </button>
        </div>
        <p className="text-xs text-white/40">사이트 주소와 이름을 정하면, 상품은 매일 자동으로 채워져요.</p>
        <label className="block space-y-1">
          <span className="text-xs text-white/50">공개 주소</span>
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[var(--input-bg)] px-3">
            <span className="text-xs text-white/35">/s/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30))}
              placeholder="my-hotdeal"
              className="w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </div>
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-white/50">사이트 이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-white/50">한 줄 소개</span>
          <input
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none"
          />
        </label>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 p-4">
        <h3 className="text-sm font-medium">노출 카테고리</h3>
        <p className="text-xs text-white/40">선택하지 않으면 전체 카테고리가 노출돼요.</p>
        <div className="flex flex-wrap gap-2">
          {HOTDEAL_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCat(c)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs',
                cats.includes(c) ? 'bg-[var(--accent)] text-white' : 'bg-white/5 text-white/55 hover:bg-white/10'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 p-4">
        <h3 className="text-sm font-medium">상품 뱃지</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-violet-500/30 px-3 py-1 text-violet-200">타임세일</span>
          <span className="rounded-full bg-rose-500/30 px-3 py-1 text-rose-200">큰 폭 할인</span>
          <span className="rounded-full bg-fuchsia-500/30 px-3 py-1 text-fuchsia-200">BEST 순위</span>
          <span className="rounded-full bg-amber-500/30 px-3 py-1 text-amber-200">역대급 할인</span>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 p-4">
        <h3 className="text-sm font-medium">사이트 스타일</h3>
        <div className="flex gap-2">
          {(
            [
              ['mostem', '모스템'],
              ['toss', '토스 (Pro)'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs',
                theme === id ? 'bg-[var(--gold)] text-black' : 'bg-white/5 text-white/55'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <h3 className="pt-2 text-sm font-medium">배경 테마</h3>
        <div className="flex gap-2">
          {(
            [
              ['light', '라이트'],
              ['dark', '다크'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setBg(id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs',
                bg === id ? 'bg-white text-black' : 'bg-white/5 text-white/55'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {err ? <p className="text-sm text-rose-300">{err}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(false)}
          className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          저장
        </button>
        <button
          type="button"
          disabled={busy || !slug}
          onClick={() => void save(true)}
          className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          저장하고 발행
        </button>
      </div>
    </div>
  )
}
