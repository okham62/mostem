'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, X, ImageIcon, Sparkles, FileVideo, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VideoType, PlatformConnection } from '@/types'

interface UploadFormProps {
  connections: PlatformConnection[]
}

export function UploadForm({ connections }: UploadFormProps) {
  const [videoType, setVideoType] = useState<VideoType>('short')
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [uploadResult, setUploadResult] = useState<{ results: { channelName: string; videoUrl: string }[] } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const thumbnailFileRef = useRef<File | null>(null)  // 항상 최신 thumbnailFile 참조
  const DRAFT_KEY = 'mostem_upload_draft'

  // 불러오기: 마운트 시 저장된 임시 데이터 복원
  useEffect(() => {
    try {
      // 업로드 성공 플래그 확인 → 있으면 초기화 후 복원 안 함
      if (localStorage.getItem(DRAFT_KEY + '_done')) {
        localStorage.removeItem(DRAFT_KEY + '_done')
        localStorage.removeItem(DRAFT_KEY)
        return
      }

      const saved = localStorage.getItem(DRAFT_KEY)
      if (!saved) return
      const draft = JSON.parse(saved)

      // 24시간 지난 드래프트는 자동 삭제
      if (draft.savedAt && Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(DRAFT_KEY)
        return
      }

      if (draft.title) setTitle(draft.title)
      if (draft.description) setDescription(draft.description)
      if (draft.tags) setTags(draft.tags)
      if (draft.visibility) setVisibility(draft.visibility)
      if (draft.videoType) setVideoType(draft.videoType)
      if (draft.selectedConnectionIds) setSelectedConnectionIds(draft.selectedConnectionIds)
      // 썸네일 복원
      if (draft.thumbnailBase64) {
        setThumbnailPreview(draft.thumbnailBase64)
        fetch(draft.thumbnailBase64)
          .then(r => r.blob())
          .then(blob => {
            const file = new File([blob], draft.thumbnailName || 'thumbnail.jpg', { type: blob.type })
            thumbnailFileRef.current = file
            setThumbnailFile(file)
          }).catch(() => {})
      }
    } catch { /* 복원 실패 시 무시 */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동저장: 값 바뀔 때마다 저장
  useEffect(() => {
    // 업로드 완료 후엔 저장 안 함
    if (uploadResult) return
    try {
      const draft: Record<string, unknown> = {
        title, description, tags, visibility, videoType, selectedConnectionIds,
        savedAt: Date.now(),
      }
      // 썸네일 base64로 저장 (5MB 이하만)
      if (thumbnailPreview && thumbnailFile && thumbnailFile.size < 5 * 1024 * 1024) {
        draft.thumbnailBase64 = thumbnailPreview
        draft.thumbnailName = thumbnailFile.name
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch { /* 저장 실패 시 무시 */ }
  }, [title, description, tags, visibility, videoType, selectedConnectionIds, thumbnailPreview, thumbnailFile, uploadResult])

  const youtubeConnections = connections.filter(c => c.platform === 'youtube')
  const tiktokConnections  = connections.filter(c => c.platform === 'tiktok')
  const instagramConnections = connections.filter(c => c.platform === 'instagram')

  const toggleConnectionId = (id: string) => {
    setSelectedConnectionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleAllInPlatform = (conns: PlatformConnection[], allSelected: boolean) => {
    if (allSelected) {
      setSelectedConnectionIds(prev => prev.filter(id => !conns.some(c => c.id === id)))
    } else {
      setSelectedConnectionIds(prev => {
        const toAdd = conns.map(c => c.id).filter(id => !prev.includes(id))
        return [...prev, ...toAdd]
      })
    }
  }

  const handleVideoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file)
    }
  }, [])

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      thumbnailFileRef.current = file
      setThumbnailFile(file)
      setThumbnailPreview(URL.createObjectURL(file))
    }
  }

  const addTag = (input?: string) => {
    const raw = (input ?? tagInput).trim()
    if (!raw) return

    // 쉼표로 여러 태그 한꺼번에 추가
    const newTags = raw
      .split(',')
      .map(t => t.trim().replace(/^#/, '').trim())
      .filter(Boolean)

    if (newTags.length === 0) return

    const existing = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
    const merged = [...existing]
    newTags.forEach(t => {
      if (t && !merged.includes(t)) merged.push(t)
    })
    setTags(merged.join(', '))
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags(
      tags.split(',').map(t => t.trim()).filter(t => t !== tag).join(', ')
    )
  }

  const handleAIGenerate = async () => {
    if (!title && !videoFile) return
    setIsGenerating(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type: videoType }),
      })
      const data = await res.json()
      if (data.description) setDescription(data.description)
      if (data.tags) setTags(data.tags.join(', '))
    } catch {
      // 에러 무시
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoFile || selectedConnectionIds.length === 0) return
    setIsUploading(true)
    setUploadError(null)
    setUploadResult(null)

    // 선택된 YouTube 연결 목록
    const selectedYoutubeConns = connections.filter(
      c => c.platform === 'youtube' && selectedConnectionIds.includes(c.id)
    )

    const initial: Record<string, number> = {}
    selectedYoutubeConns.forEach(c => (initial[c.id] = 0))
    setUploadProgress(initial)

    const tagList2 = tags.split(',').map(t => t.trim()).filter(Boolean)

    // 채널 1개당 업로드 처리 함수
    type ChannelResult = { channelName: string; videoUrl: string; thumbError?: string } | { error: string }
    const uploadToChannel = async (conn: PlatformConnection): Promise<ChannelResult> => {
      // Step 1: 업로드 URL 발급
      const urlRes = await fetch('/api/youtube/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          tags: tagList2,
          visibility,
          channelId: conn.channel_id,
          fileSize: videoFile.size,
          fileType: videoFile.type || 'video/mp4',
        }),
      })

      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({ error: '업로드 URL 요청 실패' }))
        return { error: `(${conn.channel_name}): ${err.error}` }
      }

      const { uploadUrl } = await urlRes.json()

      // Step 2: YouTube에 직접 업로드
      let uploadedPct = 0
      const videoData = await new Promise<{ id: string | null }>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            uploadedPct = Math.min(99, Math.round((e.loaded / e.total) * 100))
            setUploadProgress(prev => ({ ...prev, [conn.id]: uploadedPct }))
          }
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)) }
            catch { resolve({ id: null }) }
          } else {
            try {
              const err = JSON.parse(xhr.responseText)
              const reason = err?.error?.errors?.[0]?.reason || err?.error?.message || `${xhr.status}`
              reject(new Error(`YouTube 업로드 실패: ${reason}`))
            } catch {
              reject(new Error(`YouTube 업로드 실패 (${xhr.status})`))
            }
          }
        })
        xhr.addEventListener('error', () => {
          if (uploadedPct >= 90) resolve({ id: null })
          else reject(new Error('네트워크 오류'))
        })
        xhr.addEventListener('abort', () => reject(new Error('업로드 취소')))
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', videoFile.type || 'video/mp4')
        xhr.send(videoFile)
      })

      setUploadProgress(prev => ({ ...prev, [conn.id]: 100 }))

      // Step 3: videoId 확인
      let finalVideoId = videoData.id
      if (!finalVideoId) {
        const latestRes = await fetch('/api/youtube/latest-upload')
        if (latestRes.ok) {
          const latest = await latestRes.json()
          finalVideoId = latest.videoId ?? null
        }
      }

      // Step 4: 썸네일 업로드 (재시도 4회)
      const currentThumbnail = thumbnailFileRef.current
      const thumbErrors: string[] = []
      if (finalVideoId && currentThumbnail) {
        let thumbSuccess = false
        for (let attempt = 0; attempt < 4; attempt++) {
          await new Promise(r => setTimeout(r, attempt === 0 ? 5000 : 8000))
          const thumbForm = new FormData()
          thumbForm.append('videoId', finalVideoId)
          thumbForm.append('thumbnail', currentThumbnail)
          const thumbRes = await fetch('/api/youtube/set-thumbnail', { method: 'POST', body: thumbForm })
          if (thumbRes.ok) { thumbSuccess = true; break }
          const thumbErr = await thumbRes.json().catch(() => ({}))
          console.warn(`(${conn.channel_name}) 썸네일 시도 ${attempt + 1}/4 실패:`, thumbErr)
        }
        if (!thumbSuccess) thumbErrors.push(`(${conn.channel_name}) 썸네일 업로드 실패`)
      }

      // Step 5: DB 저장
      await fetch('/api/youtube/save-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: finalVideoId,
          title, description,
          tags: tagList2,
          videoType,
        }),
      })

      const result = {
        channelName: conn.channel_name,
        videoUrl: finalVideoId ? `https://www.youtube.com/watch?v=${finalVideoId}` : 'https://studio.youtube.com',
      }

      // 썸네일 오류가 있으면 result에 덧붙임 (업로드 자체는 성공)
      return thumbErrors.length > 0
        ? { ...result, thumbError: thumbErrors[0] }
        : result
    }

    try {
      // 모든 채널 동시 업로드
      const settled = await Promise.allSettled(
        selectedYoutubeConns.map(conn => uploadToChannel(conn))
      )

      const results: { channelName: string; videoUrl: string }[] = []
      const errors: string[] = []

      settled.forEach((s) => {
        if (s.status === 'fulfilled') {
          const val = s.value
          if ('error' in val) {
            errors.push(val.error)
          } else {
            results.push({ channelName: val.channelName, videoUrl: val.videoUrl })
            if (val.thumbError) errors.push(val.thumbError)
          }
        } else {
          errors.push(s.reason instanceof Error ? s.reason.message : '알 수 없는 오류')
        }
      })

      if (results.length > 0) {
        setUploadResult({ results })
        localStorage.removeItem(DRAFT_KEY)
        localStorage.setItem(DRAFT_KEY + '_done', '1')
      }
      if (errors.length > 0) {
        setUploadError(errors.join('\n'))
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : '업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)
  const maxDesc = 5000  // 단순화 (YouTube 기준)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1단계: 영상 타입 선택 */}
      <Card>
        <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">1</span>
          영상 타입
        </p>
        <div className="flex gap-3">
          {(['short', 'long'] as VideoType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setVideoType(type)
                setSelectedConnectionIds([])
              }}
              className={cn(
                'flex-1 rounded-xl border-2 py-3.5 text-sm font-medium transition-all active:scale-95',
                videoType === type
                  ? 'border-brand bg-brand/5 text-brand dark:bg-brand/10'
                  : 'border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--muted)] hover:text-[var(--foreground)]'
              )}
            >
              {type === 'short' ? '📱 쇼폼' : '🎬 롱폼'}
              <span className="ml-1 hidden sm:inline">
                {type === 'short' ? '(Shorts / Reels)' : '(유튜브 전용)'}
              </span>
            </button>
          ))}
        </div>
        {videoType === 'long' && (
          <p className="mt-2 text-xs text-[var(--muted)]">롱폼 영상은 유튜브에만 업로드 가능합니다.</p>
        )}
      </Card>

      {/* 2단계: 플랫폼 선택 */}
      <Card>
        <p className="mb-4 text-sm font-semibold text-[var(--foreground)]">
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">2</span>
          업로드 플랫폼
        </p>

        <div className="space-y-5">

          {/* ── YouTube ── */}
          {youtubeConnections.length > 0 ? (() => {
            const selCount = youtubeConnections.filter(c => selectedConnectionIds.includes(c.id)).length
            const allSel   = selCount === youtubeConnections.length
            return (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    <span className="text-sm font-semibold text-[var(--foreground)]">YouTube</span>
                    <span className="rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[11px] text-[var(--muted)]">
                      {selCount}/{youtubeConnections.length} 선택
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAllInPlatform(youtubeConnections, allSel)}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    {allSel ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {youtubeConnections.map(conn => {
                    const isSel = selectedConnectionIds.includes(conn.id)
                    return (
                      <button
                        key={conn.id}
                        type="button"
                        onClick={() => toggleConnectionId(conn.id)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95',
                          isSel
                            ? 'border-red-500 bg-red-500/10 text-red-500'
                            : 'border-[var(--card-border)] text-[var(--muted)] hover:border-red-400 hover:text-[var(--foreground)]'
                        )}
                      >
                        {isSel && <Check className="h-3 w-3 shrink-0" />}
                        {conn.channel_name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })() : (
            <div className="rounded-xl border border-dashed border-[var(--card-border)] p-4 text-center text-sm text-[var(--muted)]">
              연결된 YouTube 채널이 없습니다.{' '}
              <a href="/accounts" className="text-brand underline">채널 연결하기</a>
            </div>
          )}

          {/* ── TikTok (쇼폼만) ── */}
          {videoType === 'short' && tiktokConnections.length > 0 && (() => {
            const selCount = tiktokConnections.filter(c => selectedConnectionIds.includes(c.id)).length
            const allSel   = selCount === tiktokConnections.length
            return (
              <div className="border-t border-[var(--card-border)] pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-[var(--foreground)]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.24 8.24 0 004.84 1.56V6.78a4.85 4.85 0 01-1.07-.09z"/>
                    </svg>
                    <span className="text-sm font-semibold text-[var(--foreground)]">TikTok</span>
                    <span className="rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[11px] text-[var(--muted)]">
                      {selCount}/{tiktokConnections.length} 선택
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAllInPlatform(tiktokConnections, allSel)}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    {allSel ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tiktokConnections.map(conn => {
                    const isSel = selectedConnectionIds.includes(conn.id)
                    return (
                      <button
                        key={conn.id}
                        type="button"
                        onClick={() => toggleConnectionId(conn.id)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95',
                          isSel
                            ? 'border-[var(--foreground)] bg-[var(--foreground)]/10 text-[var(--foreground)]'
                            : 'border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]'
                        )}
                      >
                        {isSel && <Check className="h-3 w-3 shrink-0" />}
                        {conn.channel_name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* TikTok 미연결 (쇼폼만) */}
          {videoType === 'short' && tiktokConnections.length === 0 && (
            <div className="border-t border-[var(--card-border)] pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-[var(--muted)]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.24 8.24 0 004.84 1.56V6.78a4.85 4.85 0 01-1.07-.09z"/>
                  </svg>
                  <span className="text-sm font-medium text-[var(--muted)]">TikTok</span>
                </div>
                <a href="/accounts" className="text-xs text-brand underline">연결하기</a>
              </div>
            </div>
          )}

          {/* ── Instagram (쇼폼만) ── */}
          {videoType === 'short' && instagramConnections.length > 0 && (() => {
            const selCount = instagramConnections.filter(c => selectedConnectionIds.includes(c.id)).length
            const allSel   = selCount === instagramConnections.length
            return (
              <div className="border-t border-[var(--card-border)] pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                    <span className="text-sm font-semibold text-[var(--foreground)]">Instagram</span>
                    <span className="rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[11px] text-[var(--muted)]">
                      {selCount}/{instagramConnections.length} 선택
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAllInPlatform(instagramConnections, allSel)}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    {allSel ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {instagramConnections.map(conn => {
                    const isSel = selectedConnectionIds.includes(conn.id)
                    return (
                      <button
                        key={conn.id}
                        type="button"
                        onClick={() => toggleConnectionId(conn.id)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95',
                          isSel
                            ? 'border-pink-500 bg-pink-500/10 text-pink-500'
                            : 'border-[var(--card-border)] text-[var(--muted)] hover:border-pink-400 hover:text-[var(--foreground)]'
                        )}
                      >
                        {isSel && <Check className="h-3 w-3 shrink-0" />}
                        {conn.channel_name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Instagram 미연결 (쇼폼만) */}
          {videoType === 'short' && instagramConnections.length === 0 && (
            <div className="border-t border-[var(--card-border)] pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-[var(--muted)]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                  <span className="text-sm font-medium text-[var(--muted)]">Instagram</span>
                </div>
                <a href="/accounts" className="text-xs text-brand underline">연결하기</a>
              </div>
            </div>
          )}

          {/* 총 선택 요약 */}
          {selectedConnectionIds.length > 0 ? (
            <p className="text-xs font-semibold text-brand">
              📌 총 {selectedConnectionIds.length}개 계정 선택됨
            </p>
          ) : (
            <p className="text-xs text-[var(--muted)]">업로드할 채널/계정을 1개 이상 선택하세요.</p>
          )}

        </div>
      </Card>

      {/* 3단계: 영상 파일 */}
      <Card>
        <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">3</span>
          영상 파일
        </p>
        <input
          id="video-file-input"
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && setVideoFile(e.target.files[0])}
        />
        {videoFile ? (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--muted-bg)] p-4">
            <FileVideo className="h-8 w-8 shrink-0 text-brand" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-[var(--foreground)]">{videoFile.name}</p>
              <p className="text-xs text-[var(--muted)]">
                {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
            <button type="button" onClick={() => setVideoFile(null)}>
              <X className="h-4 w-4 text-[var(--muted)] hover:text-red-500" />
            </button>
          </div>
        ) : (
          <label
            htmlFor="video-file-input"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleVideoDrop}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 transition-colors',
              isDragging
                ? 'border-brand bg-brand/5'
                : 'border-[var(--card-border)] hover:border-brand hover:bg-brand/5'
            )}
          >
            <Upload className="mb-3 h-10 w-10 text-brand/60" />
            <p className="text-sm font-semibold text-[var(--foreground)]">
              <span className="hidden sm:inline">영상을 드래그하거나 </span>클릭하여 선택
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">MP4, MOV, AVI · 최대 10GB</p>
          </label>
        )}
      </Card>

      {/* 4단계: 정보 입력 */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">4</span>
            제목 · 설명 · 태그
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAIGenerate}
            loading={isGenerating}
            disabled={!title}
          >
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            AI 자동 생성
          </Button>
        </div>

        <div className="space-y-4">
          {/* 제목 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--foreground)]">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="영상 제목을 입력하세요"
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              required
            />
            <p className="mt-1 text-right text-[11px] text-[var(--muted)]">{title.length}/100</p>
          </div>

          {/* 설명 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--foreground)]">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={maxDesc}
              rows={5}
              placeholder="영상 설명을 입력하세요"
              className="w-full resize-none rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <p className="mt-1 text-right text-[11px] text-[var(--muted)]">
              {description.length}/{maxDesc}
            </p>
          </div>

          {/* 태그 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--foreground)]">해시태그</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addTag() }
                }}
                onPaste={(e) => {
                  // 붙여넣기할 때 쉼표 포함되면 자동으로 분리해서 추가
                  const pasted = e.clipboardData.getData('text')
                  if (pasted.includes(',')) {
                    e.preventDefault()
                    addTag(pasted)
                  }
                }}
                placeholder="#태그1, #태그2, #태그3 — 한꺼번에 붙여넣기 가능"
                className="flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <Button type="button" variant="secondary" size="md" onClick={() => addTag()}>추가</Button>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">쉼표(,)로 구분해서 한 번에 여러 개 추가 가능</p>
            {tagList.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tagList.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand"
                  >
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 썸네일 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--foreground)]">썸네일</label>
            <input
              id="thumbnail-file-input"
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleThumbnailChange}
            />
            {thumbnailPreview ? (
              <div className="relative w-40">
                <img
                  src={thumbnailPreview}
                  alt="썸네일 미리보기"
                  className="h-24 w-40 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => { setThumbnailFile(null); setThumbnailPreview(null) }}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="thumbnail-file-input"
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[var(--card-border)] px-4 py-2.5 text-sm text-[var(--muted)] hover:border-brand hover:text-brand"
              >
                <ImageIcon className="h-4 w-4" />
                썸네일 이미지 선택
              </label>
            )}
          </div>

          {/* 공개 설정 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--foreground)]">공개 설정</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as typeof visibility)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="public">공개</option>
              <option value="unlisted">일부 공개</option>
              <option value="private">비공개</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 업로드 진행률 */}
      {isUploading && Object.keys(uploadProgress).length > 0 && (
        <Card>
          <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">업로드 진행률</p>
          <div className="space-y-3">
            {Object.entries(uploadProgress).map(([connId, progress]) => {
              const conn = connections.find(c => c.id === connId)
              return (
                <div key={connId}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-[var(--foreground)]">
                      YouTube ({conn?.channel_name ?? connId})
                    </span>
                    <span className="text-[var(--muted)]">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted-bg)]">
                    <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* 에러 메시지 */}
      {uploadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          ❌ {uploadError}
        </div>
      )}

      {/* 업로드 성공 */}
      {uploadResult && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="mb-2 text-sm font-semibold text-green-700 dark:text-green-400">✅ 업로드 완료!</p>
          <div className="space-y-1">
            {uploadResult.results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-green-600 dark:text-green-400">({r.channelName})</span>
                <a href={r.videoUrl} target="_blank" rel="noopener noreferrer" className="truncate text-brand underline">
                  {r.videoUrl}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 제출 버튼 */}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!videoFile || selectedConnectionIds.length === 0 || !title || !!uploadResult}
        loading={isUploading}
      >
        <Upload className="h-4 w-4" />
        {isUploading
          ? '업로드 중...'
          : uploadResult
          ? '업로드 완료'
          : `${selectedConnectionIds.length}개 채널에 업로드`}
      </Button>
    </form>
  )
}
