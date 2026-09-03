'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { cleanMediaUrl, isVideoItem } from '@/lib/collect-media'
import type { CollectMediaItem } from '@/types'

function safePart(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').replace(/\s+/g, '_').slice(0, 40) || 'post'
}

function extFromUrl(url: string, fallback: string) {
  const match = url.match(/\.((?:mp4|webm|mov|m3u8|jpe?g|png|webp|gif))(?:\?|$)/i)
  return match?.[1]?.toLowerCase() === 'jpeg' ? 'jpg' : match?.[1]?.toLowerCase() ?? fallback
}

function startDownloads(files: { url: string; filename: string }[]) {
  files.forEach((file, index) => {
    window.setTimeout(() => {
      const link = document.createElement('a')
      link.href = `/api/media/download?url=${encodeURIComponent(file.url)}&filename=${encodeURIComponent(file.filename)}`
      link.download = file.filename
      link.rel = 'noreferrer'
      document.body.appendChild(link)
      link.click()
      link.remove()
    }, index * 60)
  })
}

export function MediaDownloadButtons({
  author,
  postId,
  items,
  layout = 'row',
}: {
  author?: string | null
  postId: string
  items: CollectMediaItem[]
  layout?: 'row' | 'stack'
}) {
  const [busy, setBusy] = useState<'video' | 'image' | null>(null)
  const base = `${safePart(author || 'user')}_${safePart(postId)}`
  const videos = items
    .filter(isVideoItem)
    .map((item) => cleanMediaUrl(item.videoUrl) ?? cleanMediaUrl(item.url))
    .filter((url): url is string => !!url && !url.includes('.m3u8'))
  const images = items
    .filter((item) => !isVideoItem(item))
    .map((item) => cleanMediaUrl(item.url) ?? cleanMediaUrl(item.poster))
    .filter((url): url is string => !!url)

  function download(kind: 'video' | 'image') {
    const urls = kind === 'video' ? videos : images
    if (urls.length === 0) return
    setBusy(kind)
    startDownloads(
      urls.map((url, index) => ({
        url,
        filename: `${base}_${kind}_${index + 1}.${extFromUrl(url, kind === 'video' ? 'mp4' : 'jpg')}`,
      }))
    )
    window.setTimeout(() => setBusy(null), 400 + urls.length * 60)
  }

  const buttonClass =
    layout === 'stack'
      ? 'inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-[#1b1b20] px-3 py-2 text-[12px] font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40'
      : 'inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className={layout === 'stack' ? 'grid grid-cols-2 gap-1.5' : 'flex flex-wrap items-center gap-1.5'}>
      <button
        type="button"
        disabled={videos.length === 0 || busy !== null}
        onClick={() => download('video')}
        className={buttonClass}
      >
        <Download className="h-3.5 w-3.5" />
        {busy === 'video' ? '받는 중' : '동영상 다운로드'}
      </button>
      <button
        type="button"
        disabled={images.length === 0 || busy !== null}
        onClick={() => download('image')}
        className={buttonClass}
      >
        <Download className="h-3.5 w-3.5" />
        {busy === 'image' ? '받는 중' : '이미지 다운로드'}
      </button>
    </div>
  )
}
