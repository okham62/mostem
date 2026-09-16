'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Copy,
  ExternalLink,
  Hash,
  Link2,
  PackageSearch,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Store,
  UserRound,
} from 'lucide-react'
import {
  HOTDEAL_CATEGORIES,
  PLATFORM_LABEL,
  shortPath,
  type LinkSettings,
  type ProfileBlock,
  type TrackedLink,
} from '@/lib/links'
import type { ShoppingProduct } from '@/lib/shopping'
import { cn } from '@/lib/utils'
import { MostemLogo } from '@/components/mostem-logo'

type TabId = 'convert' | 'find' | 'mine' | 'channel' | 'profile' | 'hotdeal'
type FindSub = 'coupang' | 'toss' | 'compare'
type MineSort = 'clicks' | 'newest'

const TABS: { id: TabId; label: string; icon: typeof Link2 }[] = [
  { id: 'convert', label: '링크 변환', icon: Link2 },
  { id: 'find', label: '상품찾기', icon: PackageSearch },
  { id: 'mine', label: '내 링크', icon: Hash },
  { id: 'channel', label: '채널 실적', icon: BarChart3 },
  { id: 'profile', label: '프로필 페이지', icon: UserRound },
  { id: 'hotdeal', label: '핫딜 사이트', icon: Store },
]

function origin() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('이미지 읽기 실패'))
    reader.readAsDataURL(file)
  })
}

export function LinksClient() {
  const [tab, setTab] = useState<TabId>('convert')
  const [settings, setSettings] = useState<LinkSettings | null>(null)
  const [links, setLinks] = useState<TrackedLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const ping = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2200)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/links', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '불러오기 실패')
      setSettings(data.settings)
      setLinks(data.links ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function patchSettings(body: Record<string, unknown>) {
    const res = await fetch('/api/links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '저장 실패')
    setSettings(data.settings)
    return data.settings as LinkSettings
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      ping('복사했어요')
    } catch {
      ping('복사 실패')
    }
  }

  if (loading && !settings) {
    return <div className="py-16 text-center text-sm text-white/40">불러오는 중…</div>
  }

  if (error && !settings) {
    return (
      <div className="space-y-3 py-10 text-center">
        <p className="text-sm text-rose-300">{error}</p>
        <p className="text-xs text-white/40">
          Supabase에 <code className="text-white/60">supabase/tracked_links.sql</code> 을 실행했는지 확인해 주세요.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5 border-b border-white/10 pb-3">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition',
                active
                  ? 'bg-[var(--accent)] text-white shadow-[0_0_0_1px_rgba(139,92,246,0.5)]'
                  : 'text-white/55 hover:bg-white/5 hover:text-white/80'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'convert' && settings && (
        <ConvertPanel
          settings={settings}
          links={links}
          onCreated={(link) => {
            setLinks((prev) => [link, ...prev])
            ping('링크가 만들어졌어요')
          }}
          onPrefixSave={async (prefix) => {
            await patchSettings({ prefix })
            await load()
            ping('접두사를 저장했어요')
          }}
          copyText={copyText}
        />
      )}

      {tab === 'find' && (
        <FindPanel
          onUseUrl={(url, title) => {
            setTab('convert')
            window.dispatchEvent(new CustomEvent('mostem-links-prefill', { detail: { url, title } }))
          }}
        />
      )}

      {tab === 'mine' && settings && (
        <MinePanel links={links} settings={settings} copyText={copyText} onRefresh={() => void load()} />
      )}

      {tab === 'channel' && settings && (
        <ChannelPanel links={links} settings={settings} onRefresh={() => void load()} />
      )}

      {tab === 'profile' && settings && (
        <ProfilePanel
          settings={settings}
          onSave={async (patch) => {
            await patchSettings(patch)
            ping('프로필을 저장했어요')
          }}
        />
      )}

      {tab === 'hotdeal' && settings && (
        <HotdealPanel
          settings={settings}
          onSave={async (patch) => {
            await patchSettings(patch)
            ping('핫딜 설정을 저장했어요')
          }}
        />
      )}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  )
}

function ConvertPanel({
  settings,
  links,
  onCreated,
  onPrefixSave,
  copyText,
}: {
  settings: LinkSettings
  links: TrackedLink[]
  onCreated: (link: TrackedLink) => void
  onPrefixSave: (prefix: string) => Promise<void>
  copyText: (t: string) => void
}) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [ogPreview, setOgPreview] = useState<string | null>(null)
  const [prefixDraft, setPrefixDraft] = useState(settings.prefix)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [last, setLast] = useState<TrackedLink | null>(null)

  useEffect(() => {
    setPrefixDraft(settings.prefix)
  }, [settings.prefix])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ url: string; title?: string }>).detail
      if (detail?.url) setUrl(detail.url)
      if (detail?.title) setTitle(detail.title)
    }
    window.addEventListener('mostem-links-prefill', handler)
    return () => window.removeEventListener('mostem-links-prefill', handler)
  }, [])

  async function onPickImage(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErr('이미지 파일만 올릴 수 있어요')
      return
    }
    if (file.size > 900_000) {
      setErr('이미지는 약 900KB 이하로 올려 주세요')
      return
    }
    setOgPreview(await fileToDataUrl(file))
    setErr('')
  }

  async function convert() {
    setBusy(true)
    setErr('')
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          title: title || undefined,
          ogImageUrl: ogPreview,
          channel: settings.channel_id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '변환 실패')
      setLast(data.link)
      onCreated(data.link as TrackedLink)
      setUrl('')
      setTitle('')
      setOgPreview(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '변환 실패')
    } finally {
      setBusy(false)
    }
  }

  const recent = links.slice(0, 5)

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">링크 변환</h2>
          <p className="mt-1 text-sm text-white/45">
            쿠팡·토스·네이버 상품 URL을 넣으면 클릭 추적이 되는 Mostem 단축 링크로 바꿔 드려요. 최종 이동은 입력한 원본(파트너스) 주소
            그대로입니다.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-white/55">원본 링크</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.coupang.com/vp/products/..."
            className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]/60"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-white/55">제목 (선택)</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 쿠팡 추천 상품"
            className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]/60"
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-white/55">공유 카드 이미지 (선택)</span>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-xl border border-dashed border-white/15 px-3 py-2 text-xs text-white/50 hover:border-white/30">
              이미지 선택
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
              />
            </label>
            {ogPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ogPreview} alt="" className="h-14 w-20 rounded-lg object-cover" />
            ) : (
              <span className="text-xs text-white/30">카톡·스레드 미리보기에 쓰여요</span>
            )}
          </div>
        </div>

        {err ? <p className="text-sm text-rose-300">{err}</p> : null}

        <button
          type="button"
          disabled={busy || !url.trim()}
          onClick={() => void convert()}
          className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? '변환 중…' : '변환하기'}
        </button>

        {last ? (
          <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4">
            <p className="text-xs text-white/50">단축 링크</p>
            <p className="mt-1 break-all font-mono text-sm text-[var(--gold)]">
              {origin()}
              {shortPath(last.prefix, last.code)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyText(`${origin()}${shortPath(last.prefix, last.code)}`)}
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs"
              >
                <Copy className="h-3.5 w-3.5" /> 복사
              </button>
              <a
                href={last.destination_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" /> 원본
              </a>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">최근 변환</h3>
            <span className="text-xs text-white/35">{recent.length}개</span>
          </div>
          {recent.length === 0 ? (
            <p className="text-xs text-white/35">아직 변환한 링크가 없어요</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{l.title}</p>
                    <p className="font-mono text-[11px] text-white/40">
                      /{l.prefix}/{l.code} · {l.click_count}클릭
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(`${origin()}${shortPath(l.prefix, l.code)}`)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/10"
                  >
                    복사
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <aside className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Settings2 className="h-4 w-4 text-[var(--accent)]" />
          단축 주소 설정
        </div>
        <p className="text-xs text-white/40">
          공개 주소 형태: <span className="font-mono text-white/60">mostem.kr/l/{prefixDraft}/코드</span>
        </p>
        <label className="block space-y-1.5">
          <span className="text-xs text-white/50">접두사</span>
          <div className="flex gap-2">
            <input
              value={prefixDraft}
              onChange={(e) => setPrefixDraft(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12))}
              className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--accent)]/60"
            />
            <button
              type="button"
              onClick={() => void onPrefixSave(prefixDraft)}
              className="shrink-0 rounded-xl bg-white/10 px-3 text-xs font-medium hover:bg-white/15"
            >
              저장
            </button>
          </div>
        </label>
        <p className="text-[11px] leading-relaxed text-white/35">
          쿠팡 파트너스·토스 쉐어링크는 최종 도착 URL에 붙어 있어야 수수료가 인정됩니다. Mostem은 중간에서 클릭만 기록합니다.
        </p>
      </aside>
    </div>
  )
}

function FindPanel({ onUseUrl }: { onUseUrl: (url: string, title: string) => void }) {
  const [sub, setSub] = useState<FindSub>('coupang')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [products, setProducts] = useState<ShoppingProduct[]>([])
  const [note, setNote] = useState('')
  const [searchUrl, setSearchUrl] = useState('')
  const [compareCoupang, setCompareCoupang] = useState<ShoppingProduct[]>([])
  const [compareNote, setCompareNote] = useState('')

  async function runSearch(source: 'coupang' | 'toss') {
    setBusy(true)
    setNote('')
    setSearchUrl('')
    try {
      const res = await fetch(`/api/links/search?q=${encodeURIComponent(q)}&source=${source}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '검색 실패')
      setProducts(data.products ?? [])
      setNote(data.note || '')
      setSearchUrl(data.searchUrl || '')
    } catch (e) {
      setNote(e instanceof Error ? e.message : '검색 실패')
      setProducts([])
    } finally {
      setBusy(false)
    }
  }

  async function runCompare() {
    setBusy(true)
    setCompareNote('')
    try {
      const res = await fetch(`/api/links/search?q=${encodeURIComponent(q)}&source=coupang`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '비교 실패')
      setCompareCoupang(data.products ?? [])
      setCompareNote(
        data.note ||
          '토스 쪽은 쉐어링크 키 연동 전까지 쿠팡 결과만 보여 드려요. 같은 검색어로 가격을 나란히 비교하는 화면입니다.'
      )
    } catch (e) {
      setCompareNote(e instanceof Error ? e.message : '비교 실패')
      setCompareCoupang([])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">상품찾기</h2>
        <p className="mt-1 text-sm text-white/45">홍보할 상품을 찾고, 바로 링크 변환으로 넘길 수 있어요.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['coupang', '쿠팡'],
            ['toss', '토스'],
            ['compare', '가격비교'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSub(id)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium',
              sub === id ? 'bg-[var(--gold)] text-black' : 'bg-white/5 text-white/55 hover:bg-white/10'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {sub === 'compare' ? (
        <div className="space-y-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Hash className="h-4 w-4 text-[var(--accent)]" /> 가격비교
            </h3>
            <p className="mt-1 text-sm text-white/45">같은 검색어로 쿠팡·토스 가격을 나란히 비교해요.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void runCompare()}
              placeholder="예: 무선청소기"
              className="flex-1 rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]/60"
            />
            <button
              type="button"
              disabled={busy || !q.trim()}
              onClick={() => void runCompare()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Search className="h-4 w-4" /> 비교하기
            </button>
          </div>
          {compareNote ? <p className="text-xs text-white/40">{compareNote}</p> : null}
          {!compareCoupang.length && !busy ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-12 text-center text-sm text-white/40">
              검색어를 입력해 비교해 보세요
              <p className="mt-1 text-xs text-white/30">같은 상품이 쿠팡·토스 어디가 더 싼지 바로 보여드려요.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <ProductColumn
                title="쿠팡"
                products={compareCoupang}
                onUse={onUseUrl}
              />
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/40">
                <p className="font-medium text-white/60">토스</p>
                <p className="mt-2 text-xs leading-relaxed">
                  토스 쉐어링크 키가 아직 연결되지 않았어요. 설정에서 연결하면 같은 검색어로 토스 가격이 여기에 표시됩니다.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void runSearch(sub)}
              placeholder={sub === 'coupang' ? '쿠팡 상품 검색' : '토스 상품 검색'}
              className="flex-1 rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]/60"
            />
            <button
              type="button"
              disabled={busy || !q.trim()}
              onClick={() => void runSearch(sub)}
              className="rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              검색
            </button>
          </div>
          {note ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/45">
              {note}{' '}
              {searchUrl ? (
                <a href={searchUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] underline">
                  검색 열기
                </a>
              ) : null}
            </div>
          ) : null}
          <ProductColumn title={sub === 'coupang' ? '쿠팡' : '토스'} products={products} onUse={onUseUrl} />
        </div>
      )}
    </div>
  )
}

function ProductColumn({
  title,
  products,
  onUse,
}: {
  title: string
  products: ShoppingProduct[]
  onUse: (url: string, title: string) => void
}) {
  if (!products.length) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-white/50">{title}</p>
      <ul className="space-y-2">
        {products.map((p) => (
          <li
            key={`${p.rank}-${p.title}`}
            className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm">{p.title}</p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--gold)]">{p.priceText}</p>
              <div className="mt-2 flex gap-2">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/70"
                >
                  열기
                </a>
                <button
                  type="button"
                  onClick={() => onUse(p.url, p.title)}
                  className="rounded-lg bg-[var(--accent)]/80 px-2 py-1 text-[11px] text-white"
                >
                  링크로 변환
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MinePanel({
  links,
  settings,
  copyText,
  onRefresh,
}: {
  links: TrackedLink[]
  settings: LinkSettings
  copyText: (t: string) => void
  onRefresh: () => void
}) {
  const [sort, setSort] = useState<MineSort>('clicks')
  const totalClicks = links.reduce((s, l) => s + (l.click_count || 0), 0)
  const sorted = useMemo(() => {
    const arr = [...links]
    if (sort === 'clicks') arr.sort((a, b) => b.click_count - a.click_count || b.created_at.localeCompare(a.created_at))
    else arr.sort((a, b) => b.created_at.localeCompare(a.created_at))
    return arr
  }, [links, sort])
  const topShare =
    totalClicks > 0 && sorted[0] ? Math.round((sorted[0].click_count / totalClicks) * 100) : null
  const withClicks = links.filter((l) => l.click_count > 0).length
  const coupangCount = links.filter((l) => l.platform === 'coupang').length

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">내 링크</h2>
          <p className="mt-1 text-sm text-white/45">클릭이 많은 순으로 정렬돼요. 막대 길이는 전체 클릭 대비 비중입니다.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white/60 hover:bg-white/10"
        >
          <RefreshCw className="h-3.5 w-3.5" /> 새로고침
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="만든 링크" value={`${links.length}개`} />
        <StatCard label="전체 클릭" value={`${totalClicks}회`} />
        <StatCard
          label="1위 링크 비중"
          value={topShare == null ? '—' : `${topShare}%`}
          hint={topShare == null ? '아직 클릭이 없어요' : undefined}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setSort('clicks')}
          className={cn('rounded-full px-3 py-1', sort === 'clicks' ? 'bg-[var(--accent)]' : 'bg-white/5 text-white/50')}
        >
          클릭 많은순
        </button>
        <button
          type="button"
          onClick={() => setSort('newest')}
          className={cn('rounded-full px-3 py-1', sort === 'newest' ? 'bg-[var(--accent)]' : 'bg-white/5 text-white/50')}
        >
          최신순
        </button>
        <span className="text-white/35">전체 ({links.length})</span>
        <span className="text-white/35">클릭 있음 ({withClicks})</span>
        <span className="text-white/35">쿠팡 ({coupangCount})</span>
      </div>

      <ul className="space-y-2">
        {sorted.map((l) => {
          const pct = totalClicks > 0 ? Math.max(2, Math.round((l.click_count / totalClicks) * 100)) : 0
          return (
            <li key={l.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-lg">
                  {l.platform === 'coupang' ? '🐧' : l.platform === 'toss' ? '💙' : '🔗'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.title || PLATFORM_LABEL[l.platform] || '링크'}</p>
                  <p className="font-mono text-[11px] text-white/40">
                    /{l.prefix}/{l.code} · {l.click_count}회
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <a
                    href={l.destination_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white/60"
                  >
                    원본
                  </a>
                  <button
                    type="button"
                    onClick={() => copyText(`${origin()}${shortPath(l.prefix, l.code)}`)}
                    className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white/60"
                  >
                    복사
                  </button>
                </div>
              </div>
            </li>
          )
        })}
        {!sorted.length ? (
          <li className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-white/35">
            변환한 링크가 여기 쌓여요. 접두사: <span className="font-mono">{settings.prefix}</span>
          </li>
        ) : null}
      </ul>

      <p className="text-[11px] leading-relaxed text-white/30">
        클릭은 실시간으로 집계되며, 봇·미리보기 요청은 제외하려고 합니다. 쿠팡 주문·수익은 파트너스 리포트 기준이며 하루 이상
        지연될 수 있어요.
      </p>
    </div>
  )
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-white/30">{hint}</p> : null}
    </div>
  )
}

function ChannelPanel({
  links,
  settings,
  onRefresh,
}: {
  links: TrackedLink[]
  settings: LinkSettings
  onRefresh: () => void
}) {
  const byChannel = useMemo(() => {
    const map = new Map<string, { links: number; clicks: number }>()
    for (const l of links) {
      const key = l.channel || settings.channel_id || '기본값'
      const cur = map.get(key) || { links: 0, clicks: 0 }
      cur.links += 1
      cur.clicks += l.click_count || 0
      map.set(key, cur)
    }
    if (!map.size) map.set(settings.channel_id || '기본값', { links: 0, clicks: 0 })
    return Array.from(map.entries())
  }, [links, settings.channel_id])

  const totalClicks = links.reduce((s, l) => s + (l.click_count || 0), 0)
  const updated = new Date().toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">채널 실적</h2>
          <p className="mt-1 text-sm text-white/45">
            Mostem 유입 클릭과 쿠팡 클릭·주문·수익을 채널 ID 기준으로 비교해요. (쿠팡 리포트 연동은 준비 중)
          </p>
        </div>
        <div className="text-right text-xs text-white/40">
          <p>{updated} 업데이트</p>
          <button type="button" onClick={onRefresh} className="mt-1 text-[var(--accent)] hover:underline">
            새로고침
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Mostem 클릭" value={`${totalClicks}`} />
        <StatCard label="쿠팡 클릭" value="—" hint="구분 불가" />
        <StatCard label="주문" value="0건" />
        <StatCard label="수익" value="0원" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs text-white/45">
            <tr>
              <th className="px-4 py-3 font-medium">채널</th>
              <th className="px-4 py-3 font-medium">생성 링크</th>
              <th className="px-4 py-3 font-medium">Mostem 클릭</th>
              <th className="px-4 py-3 font-medium">쿠팡 클릭</th>
              <th className="px-4 py-3 font-medium">주문</th>
              <th className="px-4 py-3 font-medium">수익</th>
            </tr>
          </thead>
          <tbody>
            {byChannel.map(([name, row]) => (
              <tr key={name} className="border-t border-white/5">
                <td className="px-4 py-3">{name}</td>
                <td className="px-4 py-3">{row.links}개</td>
                <td className="px-4 py-3">{row.clicks}회</td>
                <td className="px-4 py-3 text-white/35">구분 불가</td>
                <td className="px-4 py-3 text-white/35">구분 불가</td>
                <td className="px-4 py-3 text-white/35">구분 불가</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-relaxed text-white/30">
        Mostem 클릭은 실시간입니다. 쿠팡 파트너스 리포트는 하루 이상 지연될 수 있으며, 채널 구분 연동이 되기 전에는 “구분
        불가”로 표시됩니다.
      </p>
    </div>
  )
}

function ProfilePanel({
  settings,
  onSave,
}: {
  settings: LinkSettings
  onSave: (patch: Record<string, unknown>) => Promise<void>
}) {
  const [slug, setSlug] = useState(settings.profile_slug || '')
  const [displayName, setDisplayName] = useState(settings.display_name || '')
  const [blocks, setBlocks] = useState<ProfileBlock[]>(settings.profile_blocks || [])
  const [draftTitle, setDraftTitle] = useState('')
  const [draftUrl, setDraftUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const live = blocks.filter((b) => !b.archived)

  useEffect(() => {
    setSlug(settings.profile_slug || '')
    setDisplayName(settings.display_name || '')
    setBlocks(settings.profile_blocks || [])
  }, [settings])

  async function save(nextBlocks = blocks) {
    setBusy(true)
    setErr('')
    try {
      await onSave({
        profileSlug: slug || null,
        displayName: displayName || null,
        profileBlocks: nextBlocks,
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setBusy(false)
    }
  }

  function addBlock() {
    if (!draftUrl.trim()) return
    const next = [
      ...blocks,
      { id: crypto.randomUUID(), title: draftTitle.trim() || draftUrl.trim(), url: draftUrl.trim() },
    ]
    setBlocks(next)
    setDraftTitle('')
    setDraftUrl('')
    void save(next)
  }

  const publicPath = slug ? `/u/${slug}` : null

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">프로필 페이지</h2>
          <p className="mt-1 text-sm text-white/45">인스타 바이오에 하나만 걸 수 있을 때 쓰는 링크 모음 페이지예요.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs text-white/50">공개 주소</span>
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[var(--input-bg)] px-3">
              <span className="text-xs text-white/35">/u/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30))}
                placeholder="okham"
                className="w-full bg-transparent py-2.5 text-sm outline-none"
              />
            </div>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-white/50">표시 이름</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-white/10 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">블록 리스트</h3>
            <span className="text-xs text-white/35">리스트 ({live.length})</span>
          </div>

          {live.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <MostemLogo size={56} rounded="2xl" />
              <p className="text-sm text-white/55">첫 추천 링크를 채워 보세요</p>
              <p className="text-xs text-white/35">변환한 링크·SNS·소개 페이지를 넣을 수 있어요</p>
            </div>
          ) : (
            <ul className="mb-4 space-y-2">
              {live.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{b.title}</p>
                    <p className="truncate text-[11px] text-white/35">{b.url}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = blocks.map((x) => (x.id === b.id ? { ...x, archived: true } : x))
                      setBlocks(next)
                      void save(next)
                    }}
                    className="text-xs text-white/40 hover:text-rose-300"
                  >
                    보관
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 border-t border-white/5 pt-3">
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="제목"
              className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
            />
            <input
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              onClick={addBlock}
              className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" /> {live.length ? '링크 추가' : '첫 링크 추가'}
            </button>
          </div>
        </div>

        {err ? <p className="text-sm text-rose-300">{err}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          {busy ? '저장 중…' : '저장'}
        </button>
        {publicPath ? (
          <a href={publicPath} target="_blank" rel="noreferrer" className="ml-3 text-xs text-[var(--accent)] underline">
            공개 페이지 열기
          </a>
        ) : null}
      </div>

      <aside className="mx-auto w-full max-w-[260px]">
        <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-[#121214] shadow-2xl">
          <div className="bg-[var(--accent)]/80 px-3 py-2 text-center text-[10px] text-white/90">
            이 포스팅은 쿠팡 파트너스 활동의 수수료를 제공받을 수 있습니다.
          </div>
          <div className="flex flex-col items-center gap-3 px-4 py-8">
            <MostemLogo size={64} rounded="full" />
            <p className="font-semibold">{displayName || slug || '이름'}</p>
            {live.length === 0 ? (
              <p className="text-center text-xs text-white/40">
                아직 공개된 링크가 없어요
                <br />곧 새로운 추천을 채워넣을게요
              </p>
            ) : (
              <div className="w-full space-y-2">
                {live.slice(0, 5).map((b) => (
                  <div key={b.id} className="rounded-xl bg-white/10 px-3 py-2 text-center text-xs">
                    {b.title}
                  </div>
                ))}
              </div>
            )}
            <MostemLogo size={20} rounded="lg" className="mt-4 opacity-50" />
          </div>
        </div>
      </aside>
    </div>
  )
}

function HotdealPanel({
  settings,
  onSave,
}: {
  settings: LinkSettings
  onSave: (patch: Record<string, unknown>) => Promise<void>
}) {
  const [slug, setSlug] = useState(settings.hotdeal_slug || '')
  const [name, setName] = useState(settings.hotdeal_name || '')
  const [intro, setIntro] = useState(settings.hotdeal_intro || '')
  const [cats, setCats] = useState<string[]>(settings.hotdeal_categories || [])
  const [theme, setTheme] = useState(settings.hotdeal_theme || 'mostem')
  const [bg, setBg] = useState(settings.hotdeal_bg || 'dark')
  const [published, setPublished] = useState(!!settings.hotdeal_published)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    setSlug(settings.hotdeal_slug || '')
    setName(settings.hotdeal_name || '')
    setIntro(settings.hotdeal_intro || '')
    setCats(settings.hotdeal_categories || [])
    setTheme(settings.hotdeal_theme || 'mostem')
    setBg(settings.hotdeal_bg || 'dark')
    setPublished(!!settings.hotdeal_published)
  }, [settings])

  function fillExample() {
    setSlug((s) => s || 'my-hotdeal')
    setName((n) => n || '오리네 핫딜')
    setIntro((i) => i || '매일 새벽에 골라 담는 진짜 특가')
  }

  function toggleCat(c: string) {
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  async function save(publish?: boolean) {
    setBusy(true)
    setErr('')
    try {
      const nextPublished = publish ?? published
      await onSave({
        hotdealSlug: slug || null,
        hotdealName: name || null,
        hotdealIntro: intro || null,
        hotdealCategories: cats,
        hotdealTheme: theme,
        hotdealBg: bg,
        hotdealPublished: nextPublished,
      })
      setPublished(nextPublished)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">핫딜 사이트</h2>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              published ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/45'
            )}
          >
            {published ? '공개' : '비공개'}
          </span>
        </div>
        {slug ? (
          <a href={`/s/${slug}`} target="_blank" rel="noreferrer" className="text-xs text-[var(--accent)] underline">
            사이트 보기
          </a>
        ) : null}
      </div>

      <div className="rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-4 py-3 text-sm">
        <p className="font-medium">핫딜 사이트 시작 가이드</p>
        <p className="mt-1 text-xs text-white/50">주소·이름만 정하면 쿠팡 베스트 상품이 매일 채워지는 특가 페이지를 만들 수 있어요. (약 5분)</p>
      </div>

      <section className="space-y-3 rounded-2xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">기본 정보</h3>
          <button type="button" onClick={fillExample} className="text-xs text-[var(--accent)] hover:underline">
            예시로 채우기
          </button>
        </div>
        <p className="text-xs text-white/40">사이트 주소와 이름을 정하면, 상품은 매일 자동으로 채워져요.</p>
        <label className="block space-y-1">
          <span className="text-xs text-white/50">공개 주소</span>
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[var(--input-bg)] px-3">
            <span className="text-xs text-white/35">/s/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30))}
              placeholder="my-hotdeal"
              className="w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </div>
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-white/50">사이트 이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-white/50">한 줄 소개</span>
          <input
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none"
          />
        </label>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 p-4">
        <h3 className="text-sm font-medium">노출 카테고리</h3>
        <p className="text-xs text-white/40">선택하지 않으면 전체 카테고리가 노출돼요.</p>
        <div className="flex flex-wrap gap-2">
          {HOTDEAL_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCat(c)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs',
                cats.includes(c) ? 'bg-[var(--accent)] text-white' : 'bg-white/5 text-white/55 hover:bg-white/10'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 p-4">
        <h3 className="text-sm font-medium">상품 뱃지</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-violet-500/30 px-3 py-1 text-violet-200">타임세일</span>
          <span className="rounded-full bg-rose-500/30 px-3 py-1 text-rose-200">큰 폭 할인</span>
          <span className="rounded-full bg-fuchsia-500/30 px-3 py-1 text-fuchsia-200">BEST 순위</span>
          <span className="rounded-full bg-amber-500/30 px-3 py-1 text-amber-200">역대급 할인</span>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 p-4">
        <h3 className="text-sm font-medium">사이트 스타일</h3>
        <div className="flex gap-2">
          {(
            [
              ['mostem', '모스템'],
              ['toss', '토스 (Pro)'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs',
                theme === id ? 'bg-[var(--gold)] text-black' : 'bg-white/5 text-white/55'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <h3 className="pt-2 text-sm font-medium">배경 테마</h3>
        <div className="flex gap-2">
          {(
            [
              ['light', '라이트'],
              ['dark', '다크'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setBg(id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs',
                bg === id ? 'bg-white text-black' : 'bg-white/5 text-white/55'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {err ? <p className="text-sm text-rose-300">{err}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(false)}
          className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          저장
        </button>
        <button
          type="button"
          disabled={busy || !slug}
          onClick={() => void save(true)}
          className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          저장하고 발행
        </button>
      </div>
    </div>
  )
}
