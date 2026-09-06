'use client'

import { useState } from 'react'
import { parseMediaItems } from '@/lib/collect-media'
import {
  hamiSupportsMediaPublish,
  isHamiOnline,
  publishMediaUrl,
  requestHamiPublish,
} from '@/lib/threads-publish'
import type { CollectedPost, ConnectedAccount } from '@/types'
import { PublishModal } from './[id]/edit/publish-modal'

function captionOf(post: CollectedPost) {
  return post.caption && post.caption !== post.author && post.caption !== `@${post.author}`
    ? post.caption
    : ''
}

function mediaForPublish(post: CollectedPost) {
  return parseMediaItems(post)
    .map((item, index) => {
      const video = item.videoUrl || (item.type === 'video' ? item.url : '')
      const url = video || item.url
      if (!url) return null
      return {
        url: publishMediaUrl(url),
        sourceUrl: url.startsWith('http') ? url : undefined,
        type: (video ? 'video' : 'image') as 'video' | 'image',
        filename: video ? `video-${index + 1}.mp4` : `image-${index + 1}.jpg`,
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
}

export function ReuploadButton({
  post,
  accounts,
  className,
}: {
  post: CollectedPost
  accounts: ConnectedAccount[]
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const account =
    accounts.find((item) => item.username === post.collected_by) ?? accounts[0]

  async function publish() {
    const caption = captionOf(post)
    if (!account) {
      setMessage('설정에서 올릴 스레드 아이디를 먼저 연결하세요.')
      return
    }
    if (!caption.trim()) {
      setMessage('올릴 글이 없습니다. 편집에서 글을 확인해 주세요.')
      return
    }
    if (!isHamiOnline()) {
      setMessage('발행하려면 하미 확장이 필요해요. chrome://extensions에서 켠 뒤 이 창을 다시 열어 주세요.')
      return
    }
    const media = mediaForPublish(post)
    if (media.length && !hamiSupportsMediaPublish()) {
      setMessage('영상·사진을 같이 올리려면 하미를 0.2.4로 다시 받고 chrome://extensions에서 새로고침해 주세요.')
      return
    }
    setSaving(true)
    setMessage(media.length ? '영상·사진을 첨부해 다시 올리는 중...' : '')
    const published = await requestHamiPublish({
      text: caption,
      username: account.username,
      media,
    })
    if (!published.ok) {
      setSaving(false)
      setMessage(published.error || '재업로드에 실패했습니다.')
      return
    }
    const res = await fetch('/api/threads/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: post.id,
        caption,
        username: account.username,
      }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMessage(data.error || '올렸지만 상태 저장에 실패했습니다.')
      return
    }
    setOpen(false)
    setMessage('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMessage('')
          setOpen(true)
        }}
        className={
          className ??
          'rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/10'
        }
      >
        재업로드
      </button>
      {open && (
        <PublishModal
          title="다시 올리기"
          account={account}
          saving={saving}
          message={message}
          onClose={() => {
            if (!saving) setOpen(false)
          }}
          onExtensionUpload={() => void publish()}
        />
      )}
    </>
  )
}
