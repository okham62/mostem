'use client'

import { useState } from 'react'
import { mediaSrc } from '@/lib/collect-labels'
import { cleanMediaUrl, sortMediaVideoLeft } from '@/lib/collect-media'
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

function FallbackImage({ url }: { url: string }) {
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
      className="h-full w-full object-cover"
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

function MediaTile({ item }: { item: CollectMediaItem }) {
  const imageUrl = cleanMediaUrl(item.poster) ?? cleanMediaUrl(item.url)
  const videoUrl = cleanMediaUrl(item.videoUrl)

  if (item.type === 'video' && videoUrl) {
    return (
      <div className="relative h-full w-full">
        <video
          src={mediaSrc(videoUrl) ?? videoUrl}
          poster={imageUrl ?? undefined}
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

  if (!imageUrl) return null

  return (
    <div className="relative h-full w-full">
      <FallbackImage url={imageUrl} />
      {item.type === 'video' && <MuteIcon />}
    </div>
  )
}

export function ThreadMedia({ items }: { items: CollectMediaItem[] }) {
  const ordered = sortMediaVideoLeft(items).filter(
    (item) => cleanMediaUrl(item.url) || cleanMediaUrl(item.poster) || cleanMediaUrl(item.videoUrl)
  )
  if (ordered.length === 0) return null

  if (ordered.length === 1) {
    return (
      <div className="w-full overflow-hidden rounded-2xl">
        <div className="aspect-[4/5]">
          <MediaTile item={ordered[0]} />
        </div>
      </div>
    )
  }

  return (
    <div className="grid w-full grid-cols-2 gap-1.5">
      {ordered.slice(0, 4).map((item, index) => (
        <div key={`${item.url}-${index}`} className="aspect-[4/5] overflow-hidden rounded-2xl">
          <MediaTile item={item} />
        </div>
      ))}
    </div>
  )
}
