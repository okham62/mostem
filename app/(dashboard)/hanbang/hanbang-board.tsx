'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlatformLogo } from '@/components/platform-logos'
import { HANBANG_PLATFORMS, type HanbangPlatformId } from '@/lib/hanbang-platforms'

export type HanbangChannel = {
  id: string
  platform: string
  channel_id: string
  channel_name: string
}

function HanbangMark({ id }: { id: HanbangPlatformId }) {
  if (id === 'youtube' || id === 'instagram' || id === 'tiktok' || id === 'threads') {
    return (
      <span className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-[14px] ${id === 'threads' ? 'bg-[#101010] ring-1 ring-white/10' : ''}`}>
        <PlatformLogo id={id} className="h-11 w-11" />
      </span>
    )
  }
  if (id === 'facebook') {
    return (
      <svg viewBox="0 0 48 48" className="h-11 w-11" aria-hidden>
        <rect width="48" height="48" rx="14" fill="#0866FF" />
        <path fill="#fff" d="M26.7 36V25.2h3.3l.5-3.8h-3.8v-2c0-1.1.3-1.8 1.9-1.8h2V13.8c-.4-.1-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.8v2.9H19.4v3.8h3.7V36h3.6z" />
      </svg>
    )
  }
  if (id === 'x') {
    return (
      <svg viewBox="0 0 48 48" className="h-11 w-11" aria-hidden>
        <rect width="48" height="48" rx="14" fill="#000" stroke="#2a2a2a" />
        <path fill="#fff" d="M13.2 13h5.2l5.2 7 6.2-7h5.1l-8.2 9.3L35.2 35h-5.2l-5.8-7.6L17.6 35h-5.2l8.8-10L13.2 13z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11" aria-hidden>
      <rect width="48" height="48" rx="14" fill="#E60023" />
      <path fill="#fff" d="M24 12.5c-4 0-7.2 3.2-7.2 7.2 0 5 4.5 8.4 7.2 12.8 2.7-4.4 7.2-7.8 7.2-12.8 0-4-3.2-7.2-7.2-7.2zm0 9.7a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  )
}

export function HanbangBoard({
  channels,
  ready,
}: {
  channels: HanbangChannel[]
  ready: Record<HanbangPlatformId, boolean>
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>(() => channels.map((row) => row.id))
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)

  const selectedChannels = useMemo(
    () => channels.filter((row) => selected.includes(row.id)),
    [channels, selected]
  )

  const openConnect = (url: string) => {
    const width = 520
    const height = 720
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2)
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2)
    window.open(
      url,
      'mostem-channel-connect',
      `popup=yes,width=${width},height=${height},left=${left},top=${top}`
    )
  }

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : prev.concat(id)))
  }

  const disconnect = async (id: string) => {
    setBusyId(id)
    setNotice(null)
    try {
      const res = await fetch('/api/oauth/youtube/disconnect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: id }),
      })
      if (!res.ok) {
        setNotice('연결 해제에 실패했습니다.')
        return
      }
      setSelected((prev) => prev.filter((item) => item !== id))
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  const publish = async () => {
    if (!file || selectedChannels.length === 0 || publishing) return
    setPublishing(true)
    setNotice(null)
    const lines: string[] = []

    for (const channel of selectedChannels) {
      if (channel.platform !== 'youtube') {
        lines.push(`${channel.channel_name}: 이 플랫폼 업로드는 아직 연결되지 않았습니다.`)
        continue
      }
      setProgress(`${channel.channel_name} 업로드 중…`)
      const urlRes = await fetch('/api/youtube/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || file.name.replace(/\.[^.]+$/, ''),
          description,
          tags: [],
          visibility: 'public',
          channelId: channel.channel_id,
          fileSize: file.size,
          fileType: file.type || 'video/mp4',
        }),
      })
      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({ error: '업로드 주소를 받지 못했습니다.' }))
        lines.push(`${channel.channel_name}: ${err.error}`)
        continue
      }
      const { uploadUrl } = await urlRes.json()
      const uploaded = await new Promise<{ id?: string; error?: string }>((resolve) => {
        const xhr = new XMLHttpRequest()
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText))
            } catch {
              resolve({})
            }
            return
          }
          resolve({ error: `YouTube 업로드 실패 (${xhr.status})` })
        })
        xhr.addEventListener('error', () => resolve({ error: '네트워크 오류' }))
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
        xhr.send(file)
      })
      if (uploaded.error) {
        lines.push(`${channel.channel_name}: ${uploaded.error}`)
      } else if (uploaded.id) {
        lines.push(`${channel.channel_name}: https://www.youtube.com/watch?v=${uploaded.id}`)
      } else {
        lines.push(`${channel.channel_name}: 업로드 요청을 보냈습니다.`)
      }
    }

    setProgress(null)
    setPublishing(false)
    setNotice(lines.join('\n'))
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <div>
        <p className="text-xs font-semibold tracking-wide text-brand">MULTI PUBLISHER</p>
        <h1 className="mt-1 text-xl font-bold text-white">한방살포</h1>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">SNS 연결</p>
          <p className="text-xs text-white/40">{selectedChannels.length}개 선택</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {HANBANG_PLATFORMS.map((platform) => {
            const linked = channels.filter((row) => row.platform === platform.id)
            const primary = linked[0]
            const active = primary ? selected.includes(primary.id) : false
            return (
              <article
                key={platform.id}
                className={`flex w-[132px] shrink-0 flex-col items-center rounded-xl border px-2 py-3 ${
                  active ? 'border-sky-400/70 bg-sky-500/10' : 'border-white/10 bg-black/20'
                }`}
              >
                <HanbangMark id={platform.id} />
                <p className="mt-2 w-full truncate text-center text-xs font-medium text-white">{platform.label}</p>
                {primary ? (
                  <>
                    <p className="mt-1 w-full truncate text-center text-[11px] text-white/55">{primary.channel_name}</p>
                    <button
                      type="button"
                      onClick={() => toggle(primary.id)}
                      className={`mt-2 w-full rounded-md py-1.5 text-[11px] font-semibold ${
                        active ? 'bg-sky-500 text-white' : 'bg-white/10 text-white/70'
                      }`}
                    >
                      {active ? '선택됨' : '선택'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === primary.id}
                      onClick={() => disconnect(primary.id)}
                      className="mt-1 text-[10px] text-white/35 hover:text-white"
                    >
                      연결 해제
                    </button>
                  </>
                ) : ready[platform.id] ? (
                  <button
                    type="button"
                    onClick={() => openConnect(platform.authorize)}
                    className="mt-3 w-full rounded-md border border-white/15 py-1.5 text-center text-[11px] text-white/80 hover:bg-white/5"
                  >
                    연결하기
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setNotice(`${platform.label} 개발자 앱 키가 아직 없습니다.`)}
                    className="mt-3 w-full rounded-md border border-white/15 py-1.5 text-[11px] text-white/55"
                  >
                    연결하기
                  </button>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <label
          className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const dropped = event.dataTransfer.files?.[0]
            if (dropped) setFile(dropped)
          }}
        >
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <span className="text-sm text-white/70">{file ? file.name : '영상을 드래그하거나 클릭하여 업로드'}</span>
          <span className="mt-1 text-xs text-white/35">MP4, MOV, WebM</span>
        </label>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="제목"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="설명"
            rows={6}
            className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
          />
          <button
            type="button"
            disabled={!file || selectedChannels.length === 0 || publishing}
            onClick={publish}
            className="w-full rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
          >
            {publishing ? progress || '발행 중…' : '선택한 플랫폼에 발행'}
          </button>
        </div>
      </section>

      {notice && (
        <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/75">
          {notice}
        </pre>
      )}
    </div>
  )
}
