'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, ExternalLink, KeyRound, Link2, LoaderCircle, Unplug } from 'lucide-react'
import type { PartnerStatusPublic } from '@/lib/partners'
import { cn } from '@/lib/utils'

const GUIDE: Record<
  string,
  { title: string; steps: string[]; primaryLabel: string; primaryUrl: string; docsLabel: string; docsUrl: string }
> = {
  coupang:
    {
      title: '키 발급 안내',
      steps: [
        '쿠팡 파트너스에 로그인합니다.',
        'Tools → 파트너스 API 메뉴로 이동합니다.',
        'Access Key · Secret Key를 발급받습니다.',
        '왼쪽 칸에 붙여넣고 연결을 눌러 주세요.',
      ],
      primaryLabel: '쿠팡 파트너스에서 키 발급',
      primaryUrl: 'https://partners.coupang.com/#affiliate/ws/tools/open-api',
      docsLabel: 'Open API 도움말',
      docsUrl: 'https://partners.coupang.com/#affiliate/ws/tools/open-api',
    },
  toss: {
    title: '키 발급 순서',
    steps: [
      '토스 쉐어링크 어드민에 로그인합니다.',
      'API 연동 메뉴에서 Access · Secret Key를 발급합니다.',
      '출발지 IP에 서버 IP를 등록합니다. (왼쪽 안내 참고)',
      'Publisher ID(회원 연동 ID)를 확인합니다.',
      '키를 입력한 뒤 연결하기를 눌러 주세요.',
    ],
    primaryLabel: '토스에서 키 발급',
    primaryUrl:
      'https://business.toss.im/account/sign-in?client_id=ajvm9wq2t0p1ttet13y3qzb3rvjxhacn&redirect_uri=https%3A%2F%2Fsharelink.toss.im%2Fsignup-start',
    docsLabel: '토스 연동 문서',
    docsUrl: 'https://sharelink-docs.toss.im/guide/open-api/auth',
  },
}

export function PartnerApiSettings({
  providerId,
  onToast,
}: {
  providerId: string
  onToast: (message: string) => void
}) {
  const [provider, setProvider] = useState<PartnerStatusPublic | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [needsMigration, setNeedsMigration] = useState(false)
  const [egressIp, setEgressIp] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/settings/partners', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '불러오기 실패')
      setNeedsMigration(Boolean(data.needsMigration))
      const list = (data.providers ?? []) as PartnerStatusPublic[]
      const found = list.find((p) => p.id === providerId) || null
      setProvider(found)
      const next: Record<string, string> = {}
      found?.fields.forEach((f) => {
        next[f.key] = ''
      })
      setValues(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }, [providerId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (providerId !== 'toss') return
    let alive = true
    void fetch('/api/settings/partners/egress-ip')
      .then((r) => r.json())
      .then((d) => {
        if (alive && typeof d.ip === 'string') setEgressIp(d.ip)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [providerId])

  async function copyIp() {
    if (!egressIp) return
    try {
      await navigator.clipboard.writeText(egressIp)
      onToast('서버 IP를 복사했어요')
    } catch {
      onToast('복사에 실패했어요')
    }
  }

  async function save() {
    if (!provider) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/settings/partners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, values }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '저장 실패')
      const list = (data.providers ?? []) as PartnerStatusPublic[]
      setProvider(list.find((p) => p.id === providerId) || null)
      const cleared: Record<string, string> = {}
      provider.fields.forEach((f) => {
        cleared[f.key] = ''
      })
      setValues(cleared)
      onToast(`${provider.shortLabel} 연동을 저장했어요`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    if (!provider) return
    if (!confirm(`${provider.shortLabel} 연동을 해제할까요?`)) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/settings/partners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, clear: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '해제 실패')
      const list = (data.providers ?? []) as PartnerStatusPublic[]
      setProvider(list.find((p) => p.id === providerId) || null)
      onToast(`${provider.shortLabel} 연동을 해제했어요`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '해제 실패')
    } finally {
      setBusy(false)
    }
  }

  const guide = GUIDE[providerId]

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/45">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        불러오는 중…
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/45">
        파트너 정보를 찾을 수 없어요.
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-[var(--gold)]" />
              <h2 className="text-base font-semibold text-white">{provider.shortLabel} API 키</h2>
            </div>
            <p className="mt-1.5 text-sm text-white/45">{provider.description}</p>
          </div>
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold',
              provider.connected
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-amber-500/15 text-amber-200'
            )}
          >
            {provider.connected ? '연결됨' : '키 설정 필요'}
          </span>
        </div>

        {needsMigration ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
            DB 마이그레이션이 필요해요. Supabase에서{' '}
            <code className="text-amber-50">supabase/partners_api.sql</code> 을 실행해 주세요.
          </p>
        ) : null}

        {providerId === 'toss' ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-3">
            <p className="text-xs font-medium text-rose-100/90">먼저 토스에 이 IP를 등록하세요</p>
            <p className="mt-1 text-[11px] text-rose-100/60">
              쉐어링크 어드민 → API 연동 → 출발지 IP. Vercel은 IP가 바뀔 수 있어, 연결 실패 시 IP를 다시 확인해 주세요.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-black/40 px-2.5 py-1.5 font-mono text-sm text-white">
                {egressIp || '확인 중…'}
              </code>
              <button
                type="button"
                disabled={!egressIp}
                onClick={() => void copyIp()}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                <Copy className="h-3.5 w-3.5" />
                복사
              </button>
            </div>
          </div>
        ) : null}

        {provider.connected && provider.connectedAt ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-white/45">
            <span>최근 연결 · {new Date(provider.connectedAt).toLocaleString('ko-KR')}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void disconnect()}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2.5 py-1 font-medium text-rose-300 hover:bg-rose-500/25 disabled:opacity-40"
            >
              <Unplug className="h-3.5 w-3.5" />
              연동 해제
            </button>
          </div>
        ) : null}

        <div className="space-y-3">
          {provider.fields.map((field) => (
            <label key={field.key} className="block space-y-1.5">
              <span className="text-xs font-medium text-white/55">{field.label}</span>
              <input
                type={field.type === 'password' ? 'password' : 'text'}
                autoComplete="off"
                value={values[field.key] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                placeholder={
                  field.hasValue
                    ? field.type === 'password'
                      ? '저장된 키 · 바꾸려면 새로 입력'
                      : field.masked || field.placeholder
                    : field.placeholder
                }
                className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]/60"
              />
              {field.help ? <p className="text-[11px] text-white/30">{field.help}</p> : null}
            </label>
          ))}
          <p className="text-[11px] text-white/30">키는 계정에만 저장되며, 화면에는 일부만 표시됩니다.</p>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto"
        >
          <KeyRound className="h-4 w-4" />
          {busy ? '확인 중…' : provider.connected ? '새 키로 교체' : '연결하기'}
        </button>
      </div>

      {guide ? (
        <aside className="h-fit space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-sm font-semibold text-white">{guide.title}</h3>
          <ol className="space-y-2 text-xs leading-relaxed text-white/50">
            {guide.steps.map((step, i) => (
              <li key={step} className="flex gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/70">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="space-y-2 pt-1">
            <a
              href={guide.primaryUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2.5 text-xs font-semibold text-white"
            >
              {guide.primaryLabel}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href={guide.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-white/70 hover:bg-white/5"
            >
              {guide.docsLabel}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </aside>
      ) : null}
    </div>
  )
}
