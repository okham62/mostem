'use client'

import { mediaSrc } from '@/lib/collect-labels'
import { sortMediaVideoLeft } from '@/lib/collect-media'
import type { CollectMediaItem } from '@/types'

function MuteIcon() {
  return (
    <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="m16 9 6 6M22 9l-6 6" />
      </svg>
    </span>
  )
}

function MediaTile({ item }: { item: CollectMediaItem }) {
  const videoUrl = item.videoUrl ?? (item.type === 'video' && /\.(mp4|m3u8|webm|mov)(\?|$)/i.test(item.url) ? item.url : null)
  const poster = mediaSrc(item.poster ?? item.url)
  const videoSrc = mediaSrc(videoUrl)

  if (item.type === 'video' && videoSrc) {
    return (
      <div className="relative h-full w-full bg-black">
        <video
          src={videoSrc}
          poster={poster ?? undefined}
          muted
          loop
          playsInline
          autoPlay
          className="h-full w-full object-cover"
        />
        <MuteIcon />
      </div>
    )
  }

  return (
    <div className="relative h-full w-full bg-black">
      {poster && <img src={poster} alt="" className="h-full w-full object-cover" />}
      {item.type === 'video' && <MuteIcon />}
    </div>
  )
}

export function ThreadMedia({ items }: { items: CollectMediaItem[] }) {
  const ordered = sortMediaVideoLeft(items)
  if (ordered.length === 0) return null

  if (ordered.length === 1) {
    return (
      <div className="w-full max-w-[280px] overflow-hidden rounded-2xl bg-black">
        <div className="aspect-[4/5]">
          <MediaTile item={ordered[0]} />
        </div>
      </div>
    )
  }

  return (
    <div className="grid w-full max-w-[420px] grid-cols-2 gap-1.5">
      {ordered.slice(0, 4).map((item, index) => (
        <div key={`${item.url}-${index}`} className="aspect-[4/5] overflow-hidden rounded-2xl bg-black">
          <MediaTile item={item} />
        </div>
      ))}
    </div>
  )
}
