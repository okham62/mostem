'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Volume2, VolumeX, X } from 'lucide-react'
import { mediaSrc } from '@/lib/collect-labels'
import { cleanMediaUrl, isVideoItem, previewMedia, sortMediaVideoLeft } from '@/lib/collect-media'
import type { CollectMediaItem } from '@/types'

type Viewer =
  | { kind: 'video'; item: CollectMediaItem }
  | { kind: 'photos'; items: CollectMediaItem[]; index: number }

function MuteIcon({ muted = true }: { muted?: boolean }) {
  return (
    <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white">
      {muted ? (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          <path d="m16 9 6 6M22 9l-6 6" />
        </svg>
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </span>
  )
}

function FallbackImage({
  url,
  fit = 'cover',
}: {
  url: string
  fit?: 'cover' | 'contain'
}) {
  const direct = cleanMediaUrl(url)
  const proxied = direct ? mediaSrc(direct) : null
  const [src, setSrc] = useState(direct ?? proxied ?? '')
  const [hidden, setHidden] = useState(!src)

  if (hidden || !src) return null

  return (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      className={fit === 'contain' ? 'max-h-full max-w-full object-contain' : 'h-full w-full object-cover'}
      onError={() => {
        if (direct && src === direct && proxied) {
          setSrc(proxied)
          return
        }
        setHidden(true)
      }}
    />
  )
}

function MediaTile({
  item,
  extraCount,
  onOpen,
}: {
  item: CollectMediaItem
  extraCount?: number
  onOpen: () => void
}) {
  const imageUrl = cleanMediaUrl(item.poster) ?? cleanMediaUrl(item.url)
  const videoUrl = cleanMediaUrl(item.videoUrl)

  return (
    <button type="button" onClick={onOpen} className="relative h-full w-full cursor-pointer">
      {item.type === 'video' && videoUrl ? (
        <video
          src={mediaSrc(videoUrl) ?? videoUrl}
          poster={imageUrl ?? undefined}
          muted
          loop
          playsInline
          autoPlay
          className="h-full w-full object-cover"
        />
      ) : imageUrl ? (
        <FallbackImage url={imageUrl} />
      ) : null}
      {(item.type === 'video' || videoUrl) && <MuteIcon />}
      {extraCount ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-2xl font-bold text-white">
          +{extraCount}
        </span>
      ) : null}
    </button>
  )
}

function VideoViewer({ item, onClose }: { item: CollectMediaItem; onClose: () => void }) {
  const [muted, setMuted] = useState(false)
  const imageUrl = cleanMediaUrl(item.poster) ?? cleanMediaUrl(item.url)
  const videoUrl = cleanMediaUrl(item.videoUrl) ?? cleanMediaUrl(item.url)

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-4 py-12">
      {videoUrl ? (
        <video
          key={videoUrl}
          src={mediaSrc(videoUrl) ?? videoUrl}
          poster={imageUrl ?? undefined}
          autoPlay
          controls
          playsInline
          muted={muted}
          className="max-h-[min(92vh,920px)] max-w-[min(100%,560px)] rounded-2xl bg-black object-contain shadow-2xl"
        />
      ) : imageUrl ? (
        <FallbackImage url={imageUrl} fit="contain" />
      ) : null}
      <button
        type="button"
        onClick={() => setMuted((value) => !value)}
        className="absolute bottom-6 right-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
        aria-label={muted ? '소리 켜기' : '음소거'}
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="닫기"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}

function PhotoViewer({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: CollectMediaItem[]
  index: number
  onIndex: (index: number) => void
  onClose: () => void
}) {
  const current = items[index]
  const imageUrl = current ? cleanMediaUrl(current.poster) ?? cleanMediaUrl(current.url) : null

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-14 py-6">
        {imageUrl ? <FallbackImage url={imageUrl} fit="contain" /> : null}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => onIndex((index - 1 + items.length) % items.length)}
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="이전 이미지"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => onIndex((index + 1) % items.length)}
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="다음 이미지"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
      {items.length > 1 && (
        <div className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 pb-5">
          {items.map((item, itemIndex) => {
            const thumb = cleanMediaUrl(item.poster) ?? cleanMediaUrl(item.url)
            if (!thumb) return null
            return (
              <button
                key={`${thumb}-${itemIndex}`}
                type="button"
                onClick={() => onIndex(itemIndex)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${
                  itemIndex === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <FallbackImage url={thumb} />
              </button>
            )
          })}
        </div>
      )}
      <p className="absolute left-4 top-4 text-sm font-medium text-white/70">
        {index + 1} / {items.length}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="닫기"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}

function MediaLightbox({ viewer, onClose, onIndex }: { viewer: Viewer; onClose: () => void; onIndex: (index: number) => void }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (viewer.kind !== 'photos' || viewer.items.length < 2) return
      if (event.key === 'ArrowLeft') onIndex((viewer.index - 1 + viewer.items.length) % viewer.items.length)
      if (event.key === 'ArrowRight') onIndex((viewer.index + 1) % viewer.items.length)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, onIndex, viewer])

  if (!ready) return null

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black/92" onClick={onClose} role="dialog" aria-modal="true">
      <div className="h-full w-full" onClick={(event) => event.stopPropagation()}>
        {viewer.kind === 'video' ? (
          <VideoViewer item={viewer.item} onClose={onClose} />
        ) : (
          <PhotoViewer items={viewer.items} index={viewer.index} onIndex={onIndex} onClose={onClose} />
        )}
      </div>
    </div>,
    document.body
  )
}

export function ThreadMedia({ items }: { items: CollectMediaItem[] }) {
  const valid = useMemo(
    () =>
      sortMediaVideoLeft(items).filter(
        (item) => cleanMediaUrl(item.url) || cleanMediaUrl(item.poster) || cleanMediaUrl(item.videoUrl)
      ),
    [items]
  )
  const photos = useMemo(() => valid.filter((item) => !isVideoItem(item)), [valid])
  const { shown, hidden } = previewMedia(valid)
  const [viewer, setViewer] = useState<Viewer | null>(null)

  if (shown.length === 0) return null

  function openTile(item: CollectMediaItem) {
    if (isVideoItem(item)) {
      setViewer({ kind: 'video', item })
      return
    }
    const index = Math.max(0, photos.findIndex((photo) => photo.url === item.url))
    setViewer({ kind: 'photos', items: photos.length ? photos : [item], index })
  }

  return (
    <>
      {shown.length === 1 ? (
        <div className="w-full overflow-hidden rounded-2xl">
          <div className="aspect-[4/5]">
            <MediaTile item={shown[0]} extraCount={hidden || undefined} onOpen={() => openTile(shown[0])} />
          </div>
        </div>
      ) : (
        <div className="grid w-full grid-cols-2 gap-1.5">
          <div className="aspect-[4/5] overflow-hidden rounded-2xl">
            <MediaTile item={shown[0]} onOpen={() => openTile(shown[0])} />
          </div>
          <div className="aspect-[4/5] overflow-hidden rounded-2xl">
            <MediaTile item={shown[1]} extraCount={hidden || undefined} onOpen={() => openTile(shown[1])} />
          </div>
        </div>
      )}
      {viewer && (
        <MediaLightbox
          viewer={viewer}
          onClose={() => setViewer(null)}
          onIndex={(index) =>
            setViewer((current) => (current?.kind === 'photos' ? { ...current, index } : current))
          }
        />
      )}
    </>
  )
}
