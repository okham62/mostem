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
}: {
  author?: string | null
  postId: string
  items: CollectMediaItem[]
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

  return (
    <>
      <button
        type="button"
        disabled={videos.length === 0 || busy !== null}
        onClick={() => download('video')}
        className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Download className="h-3 w-3" />
        {busy === 'video' ? '받는 중' : '동영상 다운로드'}
      </button>
      <button
        type="button"
        disabled={images.length === 0 || busy !== null}
        onClick={() => download('image')}
        className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Download className="h-3 w-3" />
        {busy === 'image' ? '받는 중' : '이미지 다운로드'}
      </button>
    </>
  )
}
