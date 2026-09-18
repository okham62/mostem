'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  Copy,
  ExternalLink,
  Link2,
  Palette,
  Plus,
  Share2,
  X,
} from 'lucide-react'
import {
  isValidSlug,
  profilePublicPath,
  shortPath,
  type LinkSettings,
  type ProfileBlock,
  type ProfileFontSize,
  type ProfileLayout,
  type ProfileSnsLink,
  type TrackedLink,
} from '@/lib/links'
import { normalizeProfileDesign, type ProfileDesign } from '@/lib/profile-design'
import { cn } from '@/lib/utils'
import { MostemLogo } from '@/components/mostem-logo'
import { DesignStudio, ProfilePhonePreview } from './profile-design-studio'

type View = 'main' | 'stats' | 'design'
type BlockTab = 'list' | 'archive'
type StatsRange = 'today' | '7d' | '28d' | 'all'

type StatsPayload = {
  visitors: number
  views: number
  clicks: number
  series: Array<{ date: string; views: number; clicks: number; visitors: number }>
  topClicks: Array<{ blockId: string; count: number }>
  todayViews: number
  totalViews: number
}

function origin() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

function hostLabel() {
  try {
    return new URL(origin()).host
  } catch {
    return 'mostem.kr'
  }
}

export function ProfilePanel({
  settings,
  links,
  onSave,
  onCopy,
}: {
  settings: LinkSettings
  links: TrackedLink[]
  onSave: (patch: Record<string, unknown>) => Promise<LinkSettings | void>
  onCopy: (text: string) => void
}) {
  const [view, setView] = useState<View>('main')
  const [slug, setSlug] = useState(settings.profile_slug || '')
  const [displayName, setDisplayName] = useState(settings.display_name || '')
  const [blocks, setBlocks] = useState<ProfileBlock[]>(settings.profile_blocks || [])
  const [published, setPublished] = useState(!!settings.profile_published)
  const [simpleAddress, setSimpleAddress] = useState(!!settings.profile_simple_address)
  const [avatarUrl, setAvatarUrl] = useState(settings.profile_avatar_url || '')
  const [coverUrl, setCoverUrl] = useState(settings.profile_cover_url || '')
  const [layout, setLayout] = useState<ProfileLayout | string>(settings.profile_layout || 'cover')
  const [bio, setBio] = useState(settings.profile_bio || '')
  const [sns, setSns] = useState<ProfileSnsLink[]>(settings.profile_sns || [])
  const [fontSize, setFontSize] = useState<ProfileFontSize | string>(settings.profile_font_size || 'md')
  const [design, setDesign] = useState<ProfileDesign>(() =>
    normalizeProfileDesign(settings.profile_design),
  )

  const [blockTab, setBlockTab] = useState<BlockTab>('list')
  const [blockQuery, setBlockQuery] = useState('')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftUrl, setDraftUrl] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showConnect, setShowConnect] = useState(false)
  const [showAddress, setShowAddress] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [addressDraft, setAddressDraft] = useState(settings.profile_slug || '')
  const [simpleDraft, setSimpleDraft] = useState(!!settings.profile_simple_address)
  const [busy, setBusy] = useState(false)
  const [autosave, setAutosave] = useState('')
  const [err, setErr] = useState('')

  const [statsRange, setStatsRange] = useState<StatsRange>('7d')
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    setSlug(settings.profile_slug || '')
    setDisplayName(settings.display_name || '')
    setBlocks(settings.profile_blocks || [])
    setPublished(!!settings.profile_published)
    setSimpleAddress(!!settings.profile_simple_address)
    setAvatarUrl(settings.profile_avatar_url || '')
    setCoverUrl(settings.profile_cover_url || '')
    setLayout(settings.profile_layout || 'cover')
    setBio(settings.profile_bio || '')
    setSns(settings.profile_sns || [])
    setFontSize(settings.profile_font_size || 'md')
    setDesign(normalizeProfileDesign(settings.profile_design))
    setAddressDraft(settings.profile_slug || '')
    setSimpleDraft(!!settings.profile_simple_address)
  }, [settings])

  const live = useMemo(() => blocks.filter((b) => !b.archived), [blocks])
  const archived = useMemo(() => blocks.filter((b) => b.archived), [blocks])
  const visibleBlocks = (blockTab === 'list' ? live : archived).filter((b) => {
    if (!blockQuery.trim()) return true
    const q = blockQuery.trim().toLowerCase()
    return b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)
  })

  const publicPath = profilePublicPath({
    profile_slug: slug || null,
    profile_simple_address: simpleAddress,
  })
  const publicUrl = publicPath ? `${origin()}${publicPath}` : ''
  const displayHostPath = publicPath
    ? `${hostLabel()}${publicPath}`
    : `${hostLabel()}/u/…`

  const save = useCallback(
    async (patch: Record<string, unknown>) => {
      setBusy(true)
      setErr('')
      try {
        await onSave(patch)
        setAutosave('자동 저장 완료')
        window.setTimeout(() => setAutosave(''), 1800)
      } catch (e) {
        setErr(e instanceof Error ? e.message : '저장 실패')
        throw e
      } finally {
        setBusy(false)
      }
    },
    [onSave],
  )

  const persistBlocks = async (next: ProfileBlock[]) => {
    setBlocks(next)
    await save({ profileBlocks: next })
  }

  async function togglePublished() {
    const next = !published
    setPublished(next)
    await save({ profilePublished: next })
  }

  async function saveAddress() {
    const nextSlug = addressDraft.trim().toLowerCase()
    if (!nextSlug || !isValidSlug(nextSlug)) {
      setErr('영문 소문자, 숫자, 하이픈으로 3–30자')
      return
    }
    setBusy(true)
    setErr('')
    try {
      await onSave({
        profileSlug: nextSlug,
        profileSimpleAddress: simpleDraft,
      })
      setSlug(nextSlug)
      setSimpleAddress(simpleDraft)
      setShowAddress(false)
      setAutosave('주소 저장 완료')
      window.setTimeout(() => setAutosave(''), 1800)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '주소 저장 실패')
    } finally {
      setBusy(false)
    }
  }

  async function addBlock() {
    if (!draftUrl.trim()) return
    const next = [
      ...blocks,
      {
        id: crypto.randomUUID(),
        title: draftTitle.trim() || draftUrl.trim(),
        url: draftUrl.trim(),
      },
    ]
    setDraftTitle('')
    setDraftUrl('')
    setShowAdd(false)
    await persistBlocks(next)
  }

  async function connectLink(link: TrackedLink) {
    const url = `${origin()}${shortPath(link.prefix, link.code)}`
    const next = [
      ...blocks,
      {
        id: crypto.randomUUID(),
        title: link.title || url,
        url,
      },
    ]
    setShowConnect(false)
    await persistBlocks(next)
  }

  async function loadStats(range: StatsRange) {
    setStatsLoading(true)
    try {
      const res = await fetch(`/api/links/profile/stats?range=${range}`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setStats(data as StatsPayload)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    if (view === 'stats' || view === 'main') void loadStats(statsRange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, statsRange])

  async function shareNative() {
    if (!publicUrl) return
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: displayName || '내 페이지', url: publicUrl })
        return
      } catch {
        /* fall through */
      }
    }
    onCopy(publicUrl)
  }

  if (view === 'stats') {
    return (
      <StatsView
        range={statsRange}
        onRange={setStatsRange}
        stats={stats}
        loading={statsLoading}
        blocks={blocks}
        autosave={autosave}
        onBack={() => setView('main')}
        onSave={() => void save({})}
      />
    )
  }

  if (view === 'design') {
    return (
      <DesignStudio
        initial={{
          displayName,
          bio,
          layout,
          fontSize,
          avatarUrl,
          coverUrl,
          sns,
          design,
          simpleAddress,
        }}
        live={live}
        busy={busy}
        err={err}
        onBack={() => setView('main')}
        onPersist={async (snap) => {
          setDisplayName(snap.displayName)
          setBio(snap.bio)
          setLayout(snap.layout)
          setFontSize(snap.fontSize)
          setAvatarUrl(snap.avatarUrl)
          setCoverUrl(snap.coverUrl)
          setSns(snap.sns)
          setDesign(snap.design)
          setSimpleAddress(snap.simpleAddress)
          await save({
            displayName: snap.displayName || null,
            profileBio: snap.bio || null,
            profileLayout: snap.layout,
            profileFontSize: snap.fontSize,
            profileAvatarUrl: snap.avatarUrl || null,
            profileCoverUrl: snap.coverUrl || null,
            profileSns: snap.sns,
            profileDesign: snap.design,
            profileSimpleAddress: snap.simpleAddress,
          })
        }}
      />
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">링크</h2>
          {autosave ? <span className="text-xs text-white/40">{autosave}</span> : null}
        </div>

        {/* Profile card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gold)]/20">
                  <MostemLogo size={28} rounded="full" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold">{displayName || slug || '이름 없음'}</p>
                <p className="truncate text-xs text-white/40">{displayHostPath}</p>
                <p className="mt-1 text-[11px] text-white/35">
                  오늘 {stats?.todayViews ?? 0} · 전체 {stats?.totalViews ?? 0}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAddressDraft(slug)
                setSimpleDraft(simpleAddress)
                setShowAddress(true)
              }}
              className="shrink-0 text-xs text-white/45 hover:text-white"
            >
              주소 변경 &gt;
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void togglePublished()}
              className="inline-flex items-center gap-2 text-sm"
            >
              <span
                className={cn(
                  'relative h-5 w-9 rounded-full transition',
                  published ? 'bg-[var(--accent)]' : 'bg-white/20',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white transition',
                    published ? 'left-4' : 'left-0.5',
                  )}
                />
              </span>
              <span className="text-white/70">{published ? '공개 중' : '비공개'}</span>
            </button>

            <button
              type="button"
              disabled={!publicUrl}
              onClick={() => setShowShare(true)}
              className="rounded-xl bg-white/10 px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/15 disabled:opacity-40"
            >
              내 페이지 공유
            </button>
            {publicUrl ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/15"
              >
                내 페이지 <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setView('stats')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-medium hover:bg-white/[0.07]"
            >
              <BarChart3 className="h-4 w-4" /> 통계
            </button>
            <button
              type="button"
              onClick={() => setView('design')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-medium hover:bg-white/[0.07]"
            >
              <Palette className="h-4 w-4" /> 디자인
            </button>
          </div>
        </div>

        {/* Blocks */}
        <div className="rounded-2xl border border-white/10 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">블록 리스트</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> 블록 추가
              </button>
              <button
                type="button"
                onClick={() => setShowConnect(true)}
                className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs"
              >
                내 링크 연결
              </button>
            </div>
          </div>

          <div className="mb-3 flex gap-1.5">
            <button
              type="button"
              onClick={() => setBlockTab('list')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium',
                blockTab === 'list' ? 'bg-[var(--accent)] text-white' : 'bg-white/5 text-white/50',
              )}
            >
              리스트 ({live.length})
            </button>
            <button
              type="button"
              onClick={() => setBlockTab('archive')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium',
                blockTab === 'archive' ? 'bg-[var(--accent)] text-white' : 'bg-white/5 text-white/50',
              )}
            >
              보관함 ({archived.length})
            </button>
          </div>

          <input
            value={blockQuery}
            onChange={(e) => setBlockQuery(e.target.value)}
            placeholder="제목, 주소, 내용으로 검색"
            className="mb-3 w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
          />

          {visibleBlocks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <MostemLogo size={48} rounded="2xl" />
              <p className="text-sm text-white/55">
                {blockTab === 'archive' ? '보관된 링크가 없어요' : '첫 추천 링크를 채워 보세요'}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {visibleBlocks.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{b.title}</p>
                    <p className="truncate text-[11px] text-white/35">{b.url}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {blockTab === 'list' ? (
                      <button
                        type="button"
                        onClick={() => {
                          const next = blocks.map((x) =>
                            x.id === b.id ? { ...x, archived: true } : x,
                          )
                          void persistBlocks(next)
                        }}
                        className="text-xs text-white/40 hover:text-rose-300"
                      >
                        보관
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const next = blocks.map((x) =>
                            x.id === b.id ? { ...x, archived: false } : x,
                          )
                          void persistBlocks(next)
                        }}
                        className="text-xs text-[var(--accent)]"
                      >
                        복원
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const next = blocks.filter((x) => x.id !== b.id)
                        void persistBlocks(next)
                      }}
                      className="text-xs text-white/30 hover:text-rose-300"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {err ? <p className="text-sm text-rose-300">{err}</p> : null}
      </div>

      <ProfilePhonePreview
        name={displayName || slug || '이름'}
        bio={bio}
        layout={layout}
        fontSize={fontSize}
        avatarUrl={avatarUrl}
        coverUrl={coverUrl}
        live={live}
        sns={sns}
        design={design}
      />

      {showAddress ? (
        <Modal title="주소 변경" onClose={() => setShowAddress(false)}>
          <p className="text-sm text-white/50">
            SNS 프로필에 연결할 링크인바이오 페이지 주소를 설정하세요.
          </p>
          <div className="mt-4 space-y-1.5">
            <span className="text-xs text-white/50">공개 주소</span>
            <div className="flex items-center gap-1 rounded-xl border border-[var(--accent)]/50 bg-[var(--input-bg)] px-3">
              <span className="text-xs text-white/35">{simpleDraft ? '/' : '/u/'}</span>
              <input
                value={addressDraft}
                onChange={(e) =>
                  setAddressDraft(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30),
                  )
                }
                className="w-full bg-transparent py-2.5 text-sm outline-none"
              />
            </div>
            <p className="text-[11px] leading-relaxed text-white/40">
              영문 소문자, 숫자, 하이픈으로 3–30자. 이 주소를 인스타·스레드 프로필 링크 칸에
              붙여넣으세요. 공개 토글을 켜야 방문자에게 보여요.
            </p>
          </div>

          <div className="mt-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">간단주소 사용</p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/40">
                켜면 /{addressDraft || '주소'} 로도 열려요. 기존 /u/{addressDraft || '주소'} 주소는
                계속 사용할 수 있어요. 끄고 저장하면 간단주소는 닫혀요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSimpleDraft((v) => !v)}
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition',
                simpleDraft ? 'bg-[var(--accent)]' : 'bg-white/20',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white transition',
                  simpleDraft ? 'left-5' : 'left-0.5',
                )}
              />
            </button>
          </div>

          {err ? <p className="mt-3 text-sm text-rose-300">{err}</p> : null}

          <button
            type="button"
            disabled={busy}
            onClick={() => void saveAddress()}
            className="mt-5 w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? '저장 중…' : '주소 저장'}
          </button>
        </Modal>
      ) : null}

      {showShare && publicUrl ? (
        <Modal title="내 페이지 공유하기" onClose={() => setShowShare(false)}>
          <p className="text-sm text-white/50">
            저장된 공개 페이지 주소예요. SNS 프로필이나 메시지에 붙여넣어 주세요.
          </p>
          <div className="mt-4 space-y-1.5">
            <span className="text-xs text-white/50">내 페이지 주소</span>
            <input
              readOnly
              value={publicUrl}
              className="w-full rounded-xl border border-[var(--accent)]/40 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCopy(publicUrl)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Copy className="h-4 w-4" /> 주소 복사
            </button>
            <button
              type="button"
              onClick={() => void shareNative()}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-sm font-medium"
            >
              <Share2 className="h-4 w-4" /> 다른 앱으로 공유
            </button>
          </div>
        </Modal>
      ) : null}

      {showAdd ? (
        <Modal title="블록 추가" onClose={() => setShowAdd(false)}>
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="제목"
            className="mb-2 w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none"
          />
          <input
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void addBlock()}
            className="mt-4 w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white"
          >
            추가
          </button>
        </Modal>
      ) : null}

      {showConnect ? (
        <Modal title="내 링크 연결" onClose={() => setShowConnect(false)}>
          {links.length === 0 ? (
            <p className="text-sm text-white/45">변환한 링크가 아직 없어요.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {links.slice(0, 40).map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => void connectLink(l)}
                    className="flex w-full items-start gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-left hover:bg-white/[0.07]"
                  >
                    <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{l.title}</span>
                      <span className="block truncate text-[11px] text-white/35">
                        {shortPath(l.prefix, l.code)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      ) : null}
    </div>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#16161a] p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-white/40 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function StatsView({
  range,
  onRange,
  stats,
  loading,
  blocks,
  autosave,
  onBack,
  onSave,
}: {
  range: StatsRange
  onRange: (r: StatsRange) => void
  stats: StatsPayload | null
  loading: boolean
  blocks: ProfileBlock[]
  autosave: string
  onBack: () => void
  onSave: () => void
}) {
  const ranges: { id: StatsRange; label: string }[] = [
    { id: 'today', label: '오늘 실시간' },
    { id: '7d', label: '최근 7일' },
    { id: '28d', label: '최근 28일' },
    { id: 'all', label: '전체 기간' },
  ]
  const maxViews = Math.max(1, ...(stats?.series.map((s) => s.views) || [1]))
  const titleById = Object.fromEntries(blocks.map((b) => [b.id, b.title]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-white/70">
          <ArrowLeft className="h-4 w-4" /> 통계
        </button>
        <div className="flex items-center gap-2">
          {autosave ? <span className="text-xs text-white/40">{autosave}</span> : null}
          <button
            type="button"
            onClick={onSave}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            저장
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ranges.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onRange(r.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium',
              range === r.id ? 'bg-[var(--accent)] text-white' : 'bg-white/5 text-white/50',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-white/40">
        방문자는 브라우저 식별자로 집계되며, 30분 이내 재방문은 중복되지 않습니다.
      </p>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '방문자', value: `${stats?.visitors ?? 0}명` },
          { label: '페이지 조회', value: `${stats?.views ?? 0}회` },
          { label: '링크 클릭', value: `${stats?.clicks ?? 0}회` },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-4 text-center">
            <p className="text-[11px] text-white/40">{c.label}</p>
            <p className="mt-1 text-lg font-semibold">{loading ? '…' : c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <p className="mb-3 text-xs text-white/45">추이</p>
        <div className="flex h-36 items-end gap-1">
          {(stats?.series || []).length === 0 ? (
            <p className="m-auto text-xs text-white/35">아직 데이터가 없어요</p>
          ) : (
            (stats?.series || []).map((s) => (
              <div key={s.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-[var(--accent)]/80"
                  style={{ height: `${Math.max(4, (s.views / maxViews) * 100)}%` }}
                  title={`${s.date}: 조회 ${s.views}`}
                />
                <span className="text-[9px] text-white/30">{s.date.slice(5)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 p-4">
        <h3 className="text-sm font-medium">오늘 클릭 TOP 5</h3>
        {(stats?.topClicks || []).length === 0 ? (
          <p className="mt-4 text-center text-xs text-white/40">아직 클릭 기록이 없어요</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(stats?.topClicks || []).map((row, i) => (
              <li key={row.blockId} className="flex items-center justify-between text-sm">
                <span className="truncate text-white/70">
                  {i + 1}. {titleById[row.blockId] || row.blockId}
                </span>
                <span className="text-white/40">{row.count}회</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
