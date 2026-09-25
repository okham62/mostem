'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  Copy,
  ExternalLink,
  GripVertical,
  Image as ImageIcon,
  Link2,
  Palette,
  Pin,
  Plus,
  Settings2,
  Share2,
  Trash2,
  X,
} from 'lucide-react'
import {
  isProfileBlockOn,
  isValidSlug,
  profileBlockImage,
  profilePublicPath,
  shortPath,
  sortProfileBlocks,
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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('이미지를 읽지 못했어요'))
    reader.readAsDataURL(file)
  })
}

function Switch({
  on,
  onClick,
  disabled,
}: {
  on: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition',
        on ? 'bg-[var(--accent)]' : 'bg-white/20',
        disabled && 'opacity-40',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white transition',
          on ? 'left-4' : 'left-0.5',
        )}
      />
    </button>
  )
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
  const [draftImage, setDraftImage] = useState('')
  const [insertAt, setInsertAt] = useState<number | null>(null)
  const [editing, setEditing] = useState<ProfileBlock | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showConnect, setShowConnect] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [showAddress, setShowAddress] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [addressDraft, setAddressDraft] = useState(settings.profile_slug || '')
  const [simpleDraft, setSimpleDraft] = useState(!!settings.profile_simple_address)
  const [busy, setBusy] = useState(false)
  const [savedLabel, setSavedLabel] = useState('')
  const [dirty, setDirty] = useState(false)
  const [err, setErr] = useState('')

  const [statsRange, setStatsRange] = useState<StatsRange>('7d')
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    if (dirty) return
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
  }, [settings, dirty])

  const live = useMemo(() => blocks.filter((b) => !b.archived), [blocks])
  const archived = useMemo(() => blocks.filter((b) => b.archived), [blocks])
  const previewBlocks = useMemo(
    () => sortProfileBlocks(live.filter((b) => isProfileBlockOn(b))),
    [live],
  )
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
        setSavedLabel('저장 완료')
        setDirty(false)
        window.setTimeout(() => setSavedLabel(''), 1800)
      } catch (e) {
        setErr(e instanceof Error ? e.message : '저장 실패')
        throw e
      } finally {
        setBusy(false)
      }
    },
    [onSave],
  )

  const persistBlocks = (next: ProfileBlock[]) => {
    setDirty(true)
    setBlocks(next)
  }

  function insertIntoLive(block: ProfileBlock, at: number | null) {
    const nextLive = [...live]
    const idx = at == null ? nextLive.length : Math.max(0, Math.min(at, nextLive.length))
    nextLive.splice(idx, 0, block)
    persistBlocks([...nextLive, ...archived])
  }

  function patchBlock(id: string, patch: Partial<ProfileBlock>) {
    persistBlocks(blocks.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  async function saveProfile() {
    const next = blocks.map((b) => {
      const image = profileBlockImage(b, links)
      return image && !String(b.image || '').trim() ? { ...b, image } : b
    })
    if (next !== blocks) setBlocks(next)
    await save({
      profileBlocks: next,
      profilePublished: published,
    })
  }

  function openAdd(at: number | null = null) {
    setInsertAt(at)
    setDraftTitle('')
    setDraftUrl('')
    setDraftImage('')
    setShowAdd(true)
  }

  function openConnect(at: number | null = null) {
    setInsertAt(at)
    setShowConnect(true)
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = live.findIndex((b) => b.id === active.id)
    const newIndex = live.findIndex((b) => b.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    persistBlocks([...arrayMove(live, oldIndex, newIndex), ...archived])
  }

  function togglePublished() {
    setDirty(true)
    setPublished((v) => !v)
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
      setSavedLabel('주소 저장 완료')
      window.setTimeout(() => setSavedLabel(''), 1800)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '주소 저장 실패')
    } finally {
      setBusy(false)
    }
  }

  async function addBlock() {
    if (!draftUrl.trim()) return
    const block: ProfileBlock = {
      id: crypto.randomUUID(),
      title: draftTitle.trim() || draftUrl.trim(),
      url: draftUrl.trim(),
      image: draftImage.trim() || null,
      enabled: true,
      pinned: false,
    }
    setDraftTitle('')
    setDraftUrl('')
    setDraftImage('')
    setShowAdd(false)
    insertIntoLive(block, insertAt)
    setInsertAt(null)
  }

  async function connectLink(link: TrackedLink) {
    const url = `${origin()}${shortPath(link.prefix, link.code)}`
    const block: ProfileBlock = {
      id: crypto.randomUUID(),
      title: link.title || url,
      url,
      image: link.og_image_url || null,
      enabled: true,
      pinned: false,
    }
    setShowConnect(false)
    insertIntoLive(block, insertAt)
    setInsertAt(null)
  }

  function saveEdit() {
    if (!editing) return
    const next = { ...editing, title: editing.title.trim() || editing.url }
    setEditing(null)
    persistBlocks(blocks.map((x) => (x.id === next.id ? next : x)))
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
        savedLabel={savedLabel}
        dirty={dirty}
        busy={busy}
        onBack={() => setView('main')}
        onSave={() => void saveProfile()}
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
        live={previewBlocks}
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">링크</h2>
          <SaveButton
            dirty={dirty}
            busy={busy}
            label={savedLabel}
            onClick={() => void saveProfile()}
          />
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
                onClick={() => openAdd(null)}
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> 블록 추가
              </button>
              <button
                type="button"
                onClick={() => openConnect(null)}
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
          ) : blockTab === 'list' && !blockQuery.trim() ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={visibleBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {visibleBlocks.map((b, i) => (
                    <SortableBlockCard
                      key={b.id}
                      block={b}
                      image={profileBlockImage(b, links)}
                      onAddAbove={() => openAdd(i)}
                      onAddBelow={() => openAdd(i + 1)}
                      onTogglePin={() => void patchBlock(b.id, { pinned: !b.pinned })}
                      onToggleEnabled={() =>
                        void patchBlock(b.id, { enabled: b.enabled === false })
                      }
                      onSettings={() => setEditing({ ...b })}
                      onDelete={() => persistBlocks(blocks.filter((x) => x.id !== b.id))}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          ) : (
            <ul className="space-y-2">
              {visibleBlocks.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {profileBlockImage(b, links) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profileBlockImage(b, links)}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white/10">
                        <ImageIcon className="h-6 w-6 text-white/30" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm">{b.title}</p>
                      <p className="truncate text-[11px] text-white/35">{b.url}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {blockTab === 'archive' ? (
                      <button
                        type="button"
                        onClick={() => void patchBlock(b.id, { archived: false })}
                        className="text-xs text-[var(--accent)]"
                      >
                        복원
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing({ ...b })}
                        className="text-xs text-white/45"
                      >
                        설정
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void persistBlocks(blocks.filter((x) => x.id !== b.id))}
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
        live={previewBlocks}
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
        <Modal title="블록 추가" onClose={() => { setShowAdd(false); setInsertAt(null) }}>
          <BlockFields
            title={draftTitle}
            url={draftUrl}
            image={draftImage}
            onTitle={setDraftTitle}
            onUrl={setDraftUrl}
            onImage={setDraftImage}
          />
          <button
            type="button"
            onClick={() => void addBlock()}
            className="mt-4 w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white"
          >
            추가
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAdd(false)
              setShowConnect(true)
            }}
            className="mt-2 w-full rounded-xl bg-white/10 py-2 text-xs text-white/60"
          >
            내 링크에서 고르기
          </button>
        </Modal>
      ) : null}

      {editing ? (
        <Modal title="블록 설정" onClose={() => setEditing(null)}>
          <BlockFields
            title={editing.title}
            url={editing.url}
            image={editing.image || ''}
            onTitle={(title) => setEditing({ ...editing, title })}
            onUrl={(url) => setEditing({ ...editing, url })}
            onImage={(image) => setEditing({ ...editing, image })}
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-sm text-white/70">고정</span>
            <Switch
              on={!!editing.pinned}
              onClick={() => setEditing({ ...editing, pinned: !editing.pinned })}
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm text-white/70">프로필에 표시</span>
            <Switch
              on={editing.enabled !== false}
              onClick={() =>
                setEditing({ ...editing, enabled: editing.enabled === false })
              }
            />
          </div>
          <button
            type="button"
            onClick={() => void saveEdit()}
            className="mt-4 w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white"
          >
            저장
          </button>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const id = editing.id
                setEditing(null)
                void patchBlock(id, { archived: true })
              }}
              className="flex-1 rounded-xl bg-white/10 py-2 text-xs text-white/60"
            >
              보관
            </button>
            <button
              type="button"
              onClick={() => {
                const id = editing.id
                setEditing(null)
                void persistBlocks(blocks.filter((x) => x.id !== id))
              }}
              className="flex-1 rounded-xl bg-rose-500/15 py-2 text-xs text-rose-300"
            >
              삭제
            </button>
          </div>
        </Modal>
      ) : null}

      {showConnect ? (
        <Modal title="내 링크 연결" onClose={() => { setShowConnect(false); setInsertAt(null) }}>
          {links.length === 0 ? (
            <p className="text-sm text-white/45">변환한 링크가 아직 없어요.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {links.slice(0, 40).map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => void connectLink(l)}
                    className="flex w-full items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-left hover:bg-white/[0.07]"
                  >
                    {l.og_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.og_image_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <Link2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                    )}
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

function BlockFields({
  title,
  url,
  image,
  onTitle,
  onUrl,
  onImage,
}: {
  title: string
  url: string
  image: string
  onTitle: (v: string) => void
  onUrl: (v: string) => void
  onImage: (v: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  async function takeImage(file?: File | null) {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 4_000_000) {
      alert('이미지는 4MB 이하로 올려 주세요')
      return
    }
    onImage(await fileToDataUrl(file))
  }

  return (
    <div className="space-y-2">
      <input
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder="제목"
        className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none"
      />
      <input
        value={url}
        onChange={(e) => onUrl(e.target.value)}
        placeholder="https://..."
        className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none"
      />
      <div
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (e.currentTarget.contains(e.relatedTarget as Node)) return
          setDragOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(false)
          void takeImage(e.dataTransfer.files?.[0])
        }}
        className={cn(
          'flex items-center gap-3 rounded-2xl border border-dashed p-2 transition',
          dragOver
            ? 'border-[var(--accent)] bg-[var(--accent)]/15'
            : 'border-white/15 bg-white/[0.02]',
        )}
      >
        <label className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-white/10">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-6 w-6 text-white/30" />
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              await takeImage(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
        <div className="min-w-0 flex-1 space-y-1.5">
          <input
            value={image.startsWith('data:') ? '' : image}
            onChange={(e) => onImage(e.target.value)}
            placeholder="이미지 URL"
            className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
          />
          <p className="text-xs text-white/45">
            {dragOver ? '여기에 놓으세요' : '이미지를 드래그하거나 왼쪽을 눌러 업로드'}
          </p>
        </div>
      </div>
    </div>
  )
}

function SortableBlockCard({
  block,
  image,
  onAddAbove,
  onAddBelow,
  onTogglePin,
  onToggleEnabled,
  onSettings,
  onDelete,
}: {
  block: ProfileBlock
  image: string
  onAddAbove: () => void
  onAddBelow: () => void
  onTogglePin: () => void
  onToggleEnabled: () => void
  onSettings: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })
  const on = block.enabled !== false

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : on ? 1 : 0.55,
      }}
      className="flex min-h-[92px] overflow-hidden rounded-2xl border border-white/10 bg-[#111113]"
    >
      <button
        type="button"
        className="flex w-10 shrink-0 cursor-grab touch-none items-center justify-center self-stretch border-r border-white/10 text-white/35 hover:bg-white/[0.06] hover:text-white active:cursor-grabbing"
        title="드래그해서 순서 변경"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="w-[92px] shrink-0 self-stretch bg-white/[0.04]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-7 w-7 text-white/25" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onAddAbove}
          className="flex w-full items-center justify-center py-1.5 text-white/35 hover:bg-white/[0.04] hover:text-white"
          title="위에 추가"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-2 px-2.5 py-1.5">
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{block.title}</p>
          <button
            type="button"
            onClick={onTogglePin}
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px]',
              block.pinned ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'text-white/40 hover:text-white',
            )}
          >
            <Pin className={cn('h-3 w-3', block.pinned && 'fill-current')} />
            고정
          </button>
        </div>
        <button
          type="button"
          onClick={onAddBelow}
          className="flex w-full items-center justify-center py-1.5 text-white/35 hover:bg-white/[0.04] hover:text-white"
          title="아래에 추가"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex w-11 shrink-0 flex-col items-center justify-center gap-1.5 self-stretch border-l border-white/10">
        <button
          type="button"
          onClick={onSettings}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white"
          title="설정"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
        <Switch on={on} onClick={onToggleEnabled} />
        <button
          type="button"
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/35 hover:bg-rose-500/15 hover:text-rose-300"
          title="삭제"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#16161a] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
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

function SaveButton({
  dirty,
  busy,
  label,
  onClick,
}: {
  dirty: boolean
  busy: boolean
  label: string
  onClick: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      {label ? <span className="text-xs text-white/40">{label}</span> : null}
      {dirty && !label ? <span className="text-xs text-amber-300/80">저장되지 않음</span> : null}
      <button
        type="button"
        disabled={busy || !dirty}
        onClick={onClick}
        className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      >
        {busy ? '저장 중…' : '저장'}
      </button>
    </div>
  )
}

function StatsView({
  range,
  onRange,
  stats,
  loading,
  blocks,
  savedLabel,
  dirty,
  busy,
  onBack,
  onSave,
}: {
  range: StatsRange
  onRange: (r: StatsRange) => void
  stats: StatsPayload | null
  loading: boolean
  blocks: ProfileBlock[]
  savedLabel: string
  dirty: boolean
  busy: boolean
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
        <SaveButton dirty={dirty} busy={busy} label={savedLabel} onClick={onSave} />
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
        <p className="mb-3 text-xs text-white/45">
          추이 · 조회 {stats?.views ?? 0}회
        </p>
        <div className="flex h-40 items-stretch gap-0.5">
          {(stats?.series || []).length === 0 ? (
            <p className="m-auto text-xs text-white/35">아직 데이터가 없어요</p>
          ) : (
            (stats?.series || []).map((s) => {
              const pct = s.views <= 0 ? 0 : Math.max(8, (s.views / maxViews) * 100)
              const hourly = s.date.includes(':')
              const label = hourly ? s.date.slice(11, 13) : s.date.slice(5)
              const showLabel = !hourly || ['00', '06', '12', '18'].includes(label)
              return (
                <div key={s.date} className="flex min-w-0 flex-1 flex-col items-center">
                  <div className="flex min-h-0 w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-[var(--accent)]"
                      style={{ height: `${pct}%` }}
                      title={`${s.date} · 조회 ${s.views} · 클릭 ${s.clicks}`}
                    />
                  </div>
                  <span className="mt-1 h-3 shrink-0 text-[9px] text-white/35">
                    {showLabel ? label : ''}
                  </span>
                </div>
              )
            })
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
