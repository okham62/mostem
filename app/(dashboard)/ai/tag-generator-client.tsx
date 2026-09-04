'use client'

import { useMemo, useState } from 'react'
import { Copy, Download, LoaderCircle, RefreshCw, Sparkles, Tags } from 'lucide-react'
import type { PlatformTagResult } from '@/lib/tag-generator'
import { PlatformLogo } from '@/components/platform-logos'
import { cn } from '@/lib/utils'

const YOUTUBE_TAG_LIMIT = 500

export function TagGeneratorClient() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [generated, setGenerated] = useState(false)
  const [results, setResults] = useState<PlatformTagResult[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  const youtubeChars = useMemo(() => {
    const youtube = results.find((row) => row.platform === 'youtube')
    return youtube?.copyFormat.length ?? 0
  }, [results])

  function ping(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2000)
  }

  async function generate() {
    const value = topic.trim()
    if (value.length < 2) return
    if (generated) {
      setError('이미 생성된 태그입니다. 새로 만들기 버튼을 눌러주세요.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '태그 생성에 실패했습니다.')
      setResults(data.platforms ?? [])
      setGenerated(true)
      ping('태그가 생성되었습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '태그 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1600)
      ping('클립보드에 복사했습니다.')
    } catch {
      ping('복사에 실패했습니다.')
    }
  }

  function copyAll() {
    const text = results.map((row) => `[${row.displayName}]\n${row.copyFormat}`).join('\n\n')
    void copyText('all', text)
  }

  function download() {
    const body = [`# 태그 생성 결과`, `주제: ${topic}`, `생성일: ${new Date().toLocaleString('ko-KR')}`, '', ...results.flatMap((row) => [`## ${row.displayName}`, row.copyFormat, ''])].join('\n')
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `태그_${topic.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    ping('태그를 다운로드했습니다.')
  }

  function reset() {
    setTopic('')
    setResults([])
    setGenerated(false)
    setError('')
    ping('초기화했습니다.')
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {toast && (
        <div className="fixed right-4 top-4 z-[70] rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/20 text-brand">
          <Tags className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-white md:text-3xl">AI 태그 생성기</h1>
        <p className="mt-2 text-sm text-white/50">
          태그 하나만 입력하면 유튜브·스레드·인스타·틱톡·블로그용 태그를 한 번에 만듭니다.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 md:p-6">
        <label className="mb-2 block text-sm font-medium text-white/70">태그를 생성할 주제</label>
        <textarea
          value={topic}
          maxLength={200}
          rows={3}
          disabled={loading}
          placeholder="예: 인공지능의 미래, 맛집 리뷰, 코딩 튜토리얼 (엔터로 생성)"
          className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand/50"
          onChange={(e) => setTopic(e.target.value.slice(0, 200))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (!generated && !loading) void generate()
            }
          }}
        />
        <div className="mt-1 text-right text-[11px] text-white/30">{topic.length}/200</div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={loading || topic.trim().length < 2 || generated}
            onClick={() => void generate()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-bold text-black transition hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? '태그 생성 중...' : generated ? '생성 완료' : '태그 생성하기'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/8 px-5 py-3 text-sm font-semibold text-white/70 hover:bg-white/12"
          >
            <RefreshCw className="h-4 w-4" />
            새로 만들기
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
        )}
      </section>

      {results.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {topic} · {results.length}개 플랫폼
              </h2>
              <p className="text-xs text-white/40">
                유튜브 태그 {youtubeChars}/{YOUTUBE_TAG_LIMIT}자
                {youtubeChars > YOUTUBE_TAG_LIMIT ? ' · 한도를 넘었습니다. 앞에서부터 붙여넣으세요.' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyAll}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white"
              >
                <Copy className="h-3.5 w-3.5" />
                전체 복사
              </button>
              <button
                type="button"
                onClick={download}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
              >
                <Download className="h-3.5 w-3.5" />
                다운로드
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {results.map((row) => (
              <article
                key={row.platform}
                className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <PlatformLogo id={row.platform} className="h-5 w-5 shrink-0" />
                    {row.displayName}
                  </h3>
                  <button
                    type="button"
                    onClick={() => void copyText(row.platform, row.copyFormat)}
                    className={cn(
                      'rounded-md px-2 py-1 text-[11px] font-semibold',
                      copied === row.platform
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-white/8 text-white/60 hover:bg-white/12',
                    )}
                  >
                    {copied === row.platform ? '복사됨' : '복사'}
                  </button>
                </div>
                <p className="min-h-[168px] whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-xs leading-relaxed text-white/75">
                  {row.formattedOutput}
                </p>
                <p className="mt-2 text-[11px] text-white/35">{row.tags.length}개 태그</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
