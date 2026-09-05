'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Copy, LoaderCircle, Sparkles } from 'lucide-react'
import type { AI_TOOLS } from '@/lib/ai-tools'

type Tool = (typeof AI_TOOLS)[number]

export function AiToolClient({ tool }: { tool: Tool }) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function generate() {
    const value = input.trim()
    if (value.length < 2) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: tool.id, prompt: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '생성에 실패했습니다.')
      setResult(typeof data.result === 'string' ? data.result : '')
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function copyResult() {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-5">
      <Link href="/ai" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" />
        AI 도구
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">{tool.title}</h1>
        <p className="mt-1 text-sm text-white/45">{tool.description}</p>
      </div>

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 md:p-5">
        <label className="mb-2 block text-sm font-medium text-white/70">입력</label>
        <textarea
          value={input}
          maxLength={4000}
          rows={7}
          disabled={loading}
          placeholder={tool.placeholder}
          className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-gold/50"
          onChange={(e) => setInput(e.target.value)}
        />
        <p className="mt-2 text-[11px] text-white/35">{tool.hint}</p>
        <button
          type="button"
          disabled={loading || input.trim().length < 2}
          onClick={() => void generate()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-bold text-black transition hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? '생성 중...' : '생성하기'}
        </button>
        {error ? (
          <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
      </section>

      {result ? (
        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">결과</h2>
            <button
              type="button"
              onClick={() => void copyResult()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/8 px-2.5 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/12"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{result}</pre>
        </section>
      ) : null}
    </div>
  )
}
