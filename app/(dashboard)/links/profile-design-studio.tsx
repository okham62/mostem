'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  Palette,
  Redo2,
  Settings,
  Undo2,
  UserRound,
  X,
} from 'lucide-react'
import {
  blockRadiusClass,
  blockShadowClass,
  DEFAULT_AFFILIATE_NOTICE,
  DEFAULT_PROFILE_DESIGN,
  normalizeProfileDesign,
  type ProfileDesign,
} from '@/lib/profile-design'
import {
  type ProfileBlock,
  type ProfileFontSize,
  type ProfileLayout,
  type ProfileSnsLink,
} from '@/lib/links'
import { cn } from '@/lib/utils'
import { MostemLogo } from '@/components/mostem-logo'
import { ProfileSnsIcons } from '@/components/profile-sns-icons'
import { resolveSnsUrl, SNS_PRESETS, type SnsKind } from '@/lib/profile-sns'

export type DesignTab = 'profile' | 'style' | 'block' | 'settings'

export type DesignSnapshot = {
  displayName: string
  bio: string
  layout: string
  fontSize: string
  avatarUrl: string
  coverUrl: string
  sns: ProfileSnsLink[]
  design: ProfileDesign
  simpleAddress: boolean
}

type Props = {
  initial: DesignSnapshot
  live: ProfileBlock[]
  busy: boolean
  err: string
  onBack: () => void
  onPersist: (snap: DesignSnapshot) => Promise<void>
}

const TABS: { id: DesignTab; label: string; icon: typeof UserRound }[] = [
  { id: 'profile', label: '프로필', icon: UserRound },
  { id: 'style', label: '스타일', icon: Palette },
  { id: 'block', label: '블록', icon: LayoutGrid },
  { id: 'settings', label: '설정', icon: Settings },
]

const LAYOUTS: { id: ProfileLayout; label: string }[] = [
  { id: 'profile', label: '프로필' },
  { id: 'cover', label: '커버' },
  { id: 'cover-profile', label: '커버와 프로필' },
  { id: 'full-cover', label: '전체 커버' },
]

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('이미지 읽기 실패'))
    reader.readAsDataURL(file)
  })
}

function cloneSnap(s: DesignSnapshot): DesignSnapshot {
  return {
    ...s,
    sns: s.sns.map((x) => ({ ...x })),
    design: { ...s.design },
  }
}

function ImageEditRow({
  label,
  image,
  fallback,
  round,
  onPick,
  onFile,
  onClear,
}: {
  label: string
  image: string
  fallback?: string
  round?: boolean
  onPick: () => void
  onFile: (file: File) => void
  onClear: () => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const shown = image || fallback || ''

  return (
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
        const file = e.dataTransfer.files?.[0]
        if (file) onFile(file)
      }}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2.5',
        dragOver ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-white/10',
      )}
    >
      <button
        type="button"
        onClick={onPick}
        className={cn(
          'h-11 w-11 shrink-0 overflow-hidden bg-white/10',
          round ? 'rounded-full' : 'rounded-lg',
        )}
        title={`${label} 수정`}
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            {round ? <MostemLogo size={28} rounded="full" /> : <ImageIcon className="h-4 w-4 text-white/35" />}
          </span>
        )}
      </button>
      <button type="button" onClick={onPick} className="min-w-0 flex-1 text-left text-sm text-white/85">
        {label}
      </button>
      <button
        type="button"
        onClick={onPick}
        className="shrink-0 text-xs text-white/50 hover:text-white"
      >
        수정
      </button>
      {image ? (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-xs text-white/40 hover:text-rose-300"
        >
          삭제
        </button>
      ) : null}
    </div>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  cols,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
  cols?: number
}) {
  return (
    <div
      className={cn('grid gap-1.5', cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-4' : 'grid-cols-3')}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-xl border px-2 py-2.5 text-[11px] font-medium transition',
            value === o.id
              ? 'border-white bg-white/10 text-white'
              : 'border-white/10 text-white/45 hover:border-white/25',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ColorRow({
  label,
  value,
  onChange,
  onReset,
}: {
  label: string
  value: string | null
  onChange: (v: string) => void
  onReset: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <input
        type="color"
        value={value || '#ffffff'}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-8 cursor-pointer overflow-hidden rounded-lg border border-white/20 bg-transparent p-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white/70">{label}</p>
        <p className="text-[10px] text-white/35">{value || '기본 색상'}</p>
      </div>
      <button type="button" onClick={onReset} className="text-[11px] text-white/40 hover:text-white">
        초기화
      </button>
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  on,
  onChange,
}: {
  label: string
  hint?: string
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div>
        <p className="text-sm text-white/85">{label}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-white/40">{hint}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(!on)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition',
          on ? 'bg-[var(--accent)]' : 'bg-white/20',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white transition',
            on ? 'left-5' : 'left-0.5',
          )}
        />
      </button>
    </div>
  )
}

export function ProfilePhonePreview({
  name,
  bio,
  layout,
  fontSize,
  avatarUrl,
  coverUrl,
  live,
  sns,
  design,
}: {
  name: string
  bio: string
  layout: string
  fontSize: string
  avatarUrl: string
  coverUrl: string
  live: ProfileBlock[]
  sns: ProfileSnsLink[]
  design: ProfileDesign
}) {
  const d = design
  const themeBg =
    d.bgColor ||
    (d.theme === 'light' ? '#f4f4f5' : d.theme === 'dark' ? '#0a0a0b' : '#121214')
  const themeFg =
    d.fontColor || (d.theme === 'light' ? '#111113' : '#ffffff')
  const fontFamily =
    d.fontFamily === 'serif'
      ? 'Georgia, "Times New Roman", serif'
      : d.fontFamily === 'rounded'
        ? '"Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
        : 'inherit'
  const font = fontSize === 'sm' ? 'text-base' : fontSize === 'lg' ? 'text-2xl' : 'text-xl'
  const showCover = layout !== 'profile'
  const showAvatarOnCover = layout !== 'full-cover'
  const coverH = layout === 'full-cover' ? 'h-44' : layout === 'cover-profile' ? 'h-32' : 'h-28'
  const blockRadius = blockRadiusClass(d.blockShape)
  const blockShadow = blockShadowClass(d.blockShadow)
  const blockAlign = d.blockAlign === 'center' ? 'text-center' : 'text-left'
  const blockBg = d.blockColor || (d.theme === 'light' ? '#ffffff' : 'rgba(255,255,255,0.1)')
  const blockFg = d.blockTextColor || themeFg
  const blockBorder =
    d.blockStyle === 'outline'
      ? `1px solid ${d.blockColor || (d.theme === 'light' ? '#d4d4d8' : 'rgba(255,255,255,0.25)')}`
      : undefined
  const affiliateBg = d.affiliateBgColor || '#5b3cc4'
  const affiliateFg = d.affiliateTextColor || '#ffffff'
  const noticeText = d.affiliateNoticeText || DEFAULT_AFFILIATE_NOTICE
  const snsIcons =
    sns.length > 0 ? (
      <ProfileSnsIcons sns={sns} size="sm" align={d.snsAlign || 'center'} />
    ) : null

  return (
    <aside className="mx-auto w-full max-w-[260px]">
      <div
        className="max-h-[min(640px,70vh)] overflow-y-auto rounded-[2rem] border border-white/15 shadow-2xl"
        style={{ background: themeBg, color: themeFg, fontFamily }}
      >
        {d.noticeEnabled && d.noticeText ? (
          <div
            className={cn(
              'border-b border-black/10 px-3 py-1.5 text-[10px]',
              d.noticeMarquee && 'overflow-hidden whitespace-nowrap',
            )}
          >
            {d.noticeUrl ? (
              <a href={d.noticeUrl} className="underline opacity-80">
                {d.noticeText}
              </a>
            ) : (
              <span className="opacity-80">{d.noticeText}</span>
            )}
          </div>
        ) : null}

        {d.affiliateNoticeEnabled ? (
          d.affiliateNoticeStyle === 'banner' ? (
            <div
              className="px-3 py-2 text-[9px] leading-relaxed whitespace-pre-line"
              style={{ background: affiliateBg, color: affiliateFg }}
            >
              {noticeText}
            </div>
          ) : d.affiliateNoticeStyle === 'card' ? (
            <div className="px-3 pt-3">
              <div
                className="rounded-xl px-3 py-2 text-[9px] leading-relaxed whitespace-pre-line"
                style={{ background: affiliateBg, color: affiliateFg }}
              >
                {noticeText}
              </div>
            </div>
          ) : (
            <p
              className="px-3 pt-3 text-[9px] leading-relaxed whitespace-pre-line opacity-70"
              style={{ color: affiliateFg === '#ffffff' ? themeFg : affiliateFg }}
            >
              {noticeText}
            </p>
          )
        ) : null}

        {showCover ? (
          <div
            className={cn('relative', coverH)}
            style={
              coverUrl
                ? {
                    backgroundImage: `url(${coverUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : {
                    background:
                      'linear-gradient(135deg, rgba(180,83,9,0.35), rgba(120,53,15,0.25))',
                  }
            }
          >
            {showAvatarOnCover ? (
              <div className="absolute inset-x-0 -bottom-8 flex justify-center">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                    style={{ boxShadow: `0 0 0 4px ${themeBg}` }}
                  />
                ) : (
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full"
                    style={{
                      background: 'rgba(251,191,36,0.2)',
                      boxShadow: `0 0 0 4px ${themeBg}`,
                    }}
                  >
                    <MostemLogo size={36} rounded="full" />
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex justify-center pt-6">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <MostemLogo size={56} rounded="full" />
            )}
          </div>
        )}

        <div
          className={cn(
            'px-4 pb-6 text-center',
            showCover && showAvatarOnCover ? 'pt-12' : showCover ? 'pt-4' : 'pt-3',
          )}
        >
          <p className={cn('font-semibold', font)}>{name}</p>
          {bio ? <p className="mt-1 text-[11px] opacity-45">{bio}</p> : null}
          {snsIcons && d.snsPosition !== 'links' ? <div className="mt-3">{snsIcons}</div> : null}
          {live.length === 0 ? (
            <div
              className={cn(
                'mt-5 border border-dashed border-white/20 px-3 py-8',
                blockRadius,
                blockAlign,
              )}
              style={{
                borderColor: d.theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
              }}
            >
              <Link2 className="mx-auto mb-2 h-5 w-5 text-[var(--accent)] opacity-80" />
              <p className="text-xs opacity-50">아직 공개된 링크가 없어요</p>
              <p className="mt-1 text-[10px] opacity-35">곧 새로운 추천을 채워둘게요.</p>
            </div>
          ) : (
            <div className={cn('mt-4 space-y-2', d.blockAlign === 'center' && 'mx-auto')}>
              {live.map((b) => (
                <div
                  key={b.id}
                  className={cn(
                    'flex items-stretch overflow-hidden p-0 text-xs font-medium',
                    blockRadius,
                    blockShadow,
                    blockAlign,
                    d.blockAnim === 'wave' && 'animate-pulse',
                    d.blockAnim === 'bounce' && 'animate-bounce',
                    d.blockStyle === 'shadow' && !d.blockShadow && 'shadow-lg shadow-black/30',
                  )}
                  style={{
                    background: d.blockStyle === 'outline' ? 'transparent' : blockBg,
                    color: blockFg,
                    border: blockBorder,
                  }}
                >
                  {b.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.image}
                      alt=""
                      className="h-14 w-14 shrink-0 object-cover"
                    />
                  ) : null}
                  <span className="min-w-0 flex-1 truncate px-2.5 py-2">{b.title}</span>
                </div>
              ))}
            </div>
          )}

          {snsIcons && d.snsPosition === 'links' ? <div className="mt-6">{snsIcons}</div> : null}

          {!d.hideLogo ? (
            <div className="mt-6 flex items-center justify-center gap-1.5 opacity-50">
              {d.brandLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.brandLogoUrl} alt="" className="h-4 w-4 rounded object-cover" />
              ) : (
                <MostemLogo size={16} rounded="lg" />
              )}
              <span className="text-[10px]">Mostem</span>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}

export function DesignStudio({ initial, live, busy, err, onBack, onPersist }: Props) {
  const { data: session } = useSession()
  const accountImage = session?.user?.image || ''
  const [tab, setTab] = useState<DesignTab>('profile')
  const [snap, setSnap] = useState(() => cloneSnap(initial))
  const [past, setPast] = useState<DesignSnapshot[]>([])
  const [future, setFuture] = useState<DesignSnapshot[]>([])
  const [savedLabel, setSavedLabel] = useState('')
  const [showSns, setShowSns] = useState(false)
  const [snsDraft, setSnsDraft] = useState<Record<SnsKind, string>>(() =>
    Object.fromEntries(SNS_PRESETS.map((p) => [p.kind, ''])) as Record<SnsKind, string>,
  )
  const skipHistory = useRef(false)

  const pushHistory = useCallback((prev: DesignSnapshot) => {
    if (skipHistory.current) return
    setPast((p) => [...p.slice(-39), cloneSnap(prev)])
    setFuture([])
  }, [])

  const update = useCallback(
    (patch: Partial<DesignSnapshot> | ((s: DesignSnapshot) => DesignSnapshot)) => {
      setSnap((prev) => {
        pushHistory(prev)
        const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
        return cloneSnap(next)
      })
    },
    [pushHistory],
  )

  const patchDesign = useCallback(
    (partial: Partial<ProfileDesign>) => {
      update((s) => ({ ...s, design: { ...s.design, ...partial } }))
    },
    [update],
  )

  const saveNow = useCallback(async () => {
    await onPersist(snap)
    setSavedLabel('저장 완료')
    window.setTimeout(() => setSavedLabel(''), 1600)
  }, [onPersist, snap])

  function undo() {
    setPast((p) => {
      if (!p.length) return p
      const prev = p[p.length - 1]
      skipHistory.current = true
      setSnap((cur) => {
        setFuture((f) => [cloneSnap(cur), ...f].slice(0, 40))
        return cloneSnap(prev)
      })
      queueMicrotask(() => {
        skipHistory.current = false
      })
      return p.slice(0, -1)
    })
  }

  function redo() {
    setFuture((f) => {
      if (!f.length) return f
      const next = f[0]
      skipHistory.current = true
      setSnap((cur) => {
        setPast((p) => [...p, cloneSnap(cur)].slice(-40))
        return cloneSnap(next)
      })
      queueMicrotask(() => {
        skipHistory.current = false
      })
      return f.slice(1)
    })
  }

  async function applyImage(kind: 'avatar' | 'cover' | 'brand', file: File) {
    if (!file.type.startsWith('image/')) return
    if (file.size > 4_000_000) {
      alert('이미지는 4MB 이하로 올려 주세요')
      return
    }
    const dataUrl = await fileToDataUrl(file)
    if (kind === 'avatar') update({ avatarUrl: dataUrl })
    else if (kind === 'cover') update({ coverUrl: dataUrl })
    else patchDesign({ brandLogoUrl: dataUrl })
  }

  function pickImage(kind: 'avatar' | 'cover' | 'brand') {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) void applyImage(kind, file)
    }
    input.click()
  }

  const panelTitle = useMemo(() => TABS.find((t) => t.id === tab)?.label ?? '디자인', [tab])

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-6"
      onClick={onBack}
      role="presentation"
    >
      <div
        className="relative flex h-[min(860px,92vh)] w-full max-w-[1080px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0d] text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="프로필 디자인"
      >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> 디자인
        </button>
        <div className="flex items-center gap-1.5">
          {savedLabel ? <span className="mr-1 text-xs text-white/40">{savedLabel}</span> : null}
          <button
            type="button"
            onClick={undo}
            disabled={!past.length}
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 disabled:opacity-30"
            title="실행 취소"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!future.length}
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 disabled:opacity-30"
            title="다시 실행"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveNow()}
            className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            {busy ? '저장 중…' : '저장'}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[72px_minmax(0,320px)_minmax(0,1fr)]">
        <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-white/10 p-2 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:border-white/10 lg:p-3">
          {TABS.map((t) => {
            const Icon = t.icon
            const on = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex min-w-[4.5rem] flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[10px] transition lg:min-w-0',
                  on ? 'bg-[var(--accent)] text-white' : 'bg-white/[0.04] text-white/45 hover:bg-white/[0.08]',
                )}
              >
                <Icon className="h-5 w-5" />
                {t.label}
              </button>
            )
          })}
        </nav>

        <div className="max-h-[45vh] space-y-4 overflow-y-auto border-b border-white/10 p-4 lg:max-h-none lg:border-b-0 lg:border-r lg:border-white/10">
          <h3 className="text-sm font-semibold">{panelTitle}</h3>

          {tab === 'profile' ? (
            <>
              <div>
                <p className="mb-2 text-xs text-white/45">레이아웃</p>
                <div className="grid grid-cols-4 gap-2">
                  {LAYOUTS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => update({ layout: l.id })}
                      className={cn(
                        'overflow-hidden rounded-xl border text-[10px]',
                        snap.layout === l.id ? 'border-white' : 'border-white/10 text-white/50',
                      )}
                    >
                      <div className="flex h-14 flex-col bg-[#1a1a1e] p-1.5">
                        {l.id !== 'profile' ? (
                          <div className={cn('rounded bg-white/15', l.id === 'full-cover' ? 'h-8' : 'h-4')} />
                        ) : null}
                        <div
                          className={cn(
                            'mx-auto mt-auto h-3 w-3 rounded-full bg-[var(--gold)]/50',
                            l.id === 'full-cover' && 'hidden',
                          )}
                        />
                      </div>
                      <p className="bg-black/30 py-1.5">{l.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <ImageEditRow
                  label="프로필 이미지"
                  image={snap.avatarUrl}
                  fallback={accountImage}
                  round
                  onPick={() => pickImage('avatar')}
                  onFile={(file) => void applyImage('avatar', file)}
                  onClear={() => update({ avatarUrl: '' })}
                />
                <ImageEditRow
                  label="커버 이미지"
                  image={snap.coverUrl}
                  onPick={() => pickImage('cover')}
                  onFile={(file) => void applyImage('cover', file)}
                  onClear={() => update({ coverUrl: '' })}
                />
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs text-white/50">타이틀</span>
                <input
                  value={snap.displayName}
                  onChange={(e) => update({ displayName: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-white/50">설명</span>
                <textarea
                  value={snap.bio}
                  onChange={(e) => update({ bio: e.target.value })}
                  rows={3}
                  placeholder="이곳에 링크를 소개하는 페이지인지 짧게 알려 주세요."
                  className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none"
                />
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-white/50">SNS</span>
                  <button
                    type="button"
                    onClick={() => {
                      const draft = Object.fromEntries(SNS_PRESETS.map((p) => [p.kind, ''])) as Record<SnsKind, string>
                      for (const s of snap.sns) {
                        const kind = (s.kind || '') as SnsKind
                        if (kind && kind in draft) draft[kind] = s.url.replace(/^https?:\/\/(www\.)?/, '')
                      }
                      setSnsDraft(draft)
                      setShowSns(true)
                    }}
                    className="text-xs text-[var(--accent)]"
                  >
                    + 추가
                  </button>
                </div>
                <div className="space-y-2">
                  {snap.sns.map((s, idx) => (
                    <div key={s.id} className="flex gap-2">
                      <input
                        value={s.label}
                        onChange={(e) => {
                          const next = [...snap.sns]
                          next[idx] = { ...s, label: e.target.value }
                          update({ sns: next })
                        }}
                        placeholder="라벨"
                        className="w-24 rounded-xl border border-white/10 bg-[var(--input-bg)] px-2 py-2 text-xs outline-none"
                      />
                      <input
                        value={s.url}
                        onChange={(e) => {
                          const next = [...snap.sns]
                          next[idx] = { ...s, url: e.target.value }
                          update({ sns: next })
                        }}
                        placeholder="https://"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[var(--input-bg)] px-2 py-2 text-xs outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => update({ sns: snap.sns.filter((x) => x.id !== s.id) })}
                        className="text-xs text-white/30"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs text-white/50">프로필 글꼴 크기</p>
                <Segmented<ProfileFontSize>
                  value={(snap.fontSize as ProfileFontSize) || 'md'}
                  onChange={(v) => update({ fontSize: v })}
                  options={[
                    { id: 'sm', label: '작게' },
                    { id: 'md', label: '보통' },
                    { id: 'lg', label: '크게' },
                  ]}
                />
              </div>

              <div>
                <p className="mb-2 text-xs text-white/50">SNS 표시 위치</p>
                <Segmented<'profile' | 'links'>
                  value={snap.design.snsPosition || 'links'}
                  onChange={(v) => patchDesign({ snsPosition: v })}
                  cols={2}
                  options={[
                    { id: 'profile', label: '프로필 영역' },
                    { id: 'links', label: '링크 영역' },
                  ]}
                />
              </div>

              <div>
                <p className="mb-2 text-xs text-white/50">정렬</p>
                <Segmented<'left' | 'center'>
                  value={snap.design.snsAlign || 'center'}
                  onChange={(v) => patchDesign({ snsAlign: v })}
                  cols={2}
                  options={[
                    { id: 'left', label: '왼쪽' },
                    { id: 'center', label: '가운데' },
                  ]}
                />
              </div>
            </>
          ) : null}

          {tab === 'style' ? (
            <>
              <div>
                <p className="mb-2 text-xs text-white/45">테마</p>
                <Segmented
                  value={snap.design.theme}
                  onChange={(v) => patchDesign({ theme: v })}
                  options={[
                    { id: 'default', label: '기본' },
                    { id: 'light', label: '라이트' },
                    { id: 'dark', label: '다크' },
                  ]}
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-white/45">배경</p>
                <ColorRow
                  label="기본 색상"
                  value={snap.design.bgColor}
                  onChange={(v) => patchDesign({ bgColor: v })}
                  onReset={() => patchDesign({ bgColor: null })}
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-white/45">폰트 색상</p>
                <ColorRow
                  label="기본 색상"
                  value={snap.design.fontColor}
                  onChange={(v) => patchDesign({ fontColor: v })}
                  onReset={() => patchDesign({ fontColor: null })}
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-white/45">폰트</p>
                <Segmented
                  value={snap.design.fontFamily}
                  onChange={(v) => patchDesign({ fontFamily: v })}
                  options={[
                    { id: 'default', label: '기본' },
                    { id: 'serif', label: '명조' },
                    { id: 'rounded', label: '둥근 고딕' },
                  ]}
                />
              </div>
            </>
          ) : null}

          {tab === 'block' ? (
            <>
              <div>
                <p className="mb-2 text-xs text-white/45">모양</p>
                <Segmented
                  value={snap.design.blockShape}
                  onChange={(v) => patchDesign({ blockShape: v })}
                  options={[
                    { id: 'sharp', label: '각지게' },
                    { id: 'rounded', label: '둥글게' },
                    { id: 'pill', label: '아주 둥글게' },
                  ]}
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-white/45">블록 스타일</p>
                <Segmented
                  value={snap.design.blockStyle}
                  onChange={(v) => patchDesign({ blockStyle: v })}
                  options={[
                    { id: 'fill', label: '채우기' },
                    { id: 'outline', label: '테두리' },
                    { id: 'shadow', label: '그림자' },
                  ]}
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-white/45">그림자</p>
                <Segmented
                  value={snap.design.blockShadow}
                  onChange={(v) => patchDesign({ blockShadow: v })}
                  cols={4}
                  options={[
                    { id: 'none', label: '없음' },
                    { id: 'soft', label: '연하게' },
                    { id: 'medium', label: '진하게' },
                    { id: 'strong', label: '강하게' },
                  ]}
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-white/45">정렬</p>
                <Segmented
                  value={snap.design.blockAlign}
                  onChange={(v) => patchDesign({ blockAlign: v })}
                  cols={2}
                  options={[
                    { id: 'left', label: '왼쪽' },
                    { id: 'center', label: '가운데' },
                  ]}
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-white/45">애니메이션</p>
                <Segmented
                  value={snap.design.blockAnim}
                  onChange={(v) => patchDesign({ blockAnim: v })}
                  options={[
                    { id: 'none', label: '없음' },
                    { id: 'wave', label: '물결' },
                    { id: 'bounce', label: '바운스' },
                  ]}
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-white/45">블록 색상</p>
                <ColorRow
                  label="기본 색상"
                  value={snap.design.blockColor}
                  onChange={(v) => patchDesign({ blockColor: v })}
                  onReset={() => patchDesign({ blockColor: null })}
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-white/45">블록 글자 색상</p>
                <ColorRow
                  label="기본 색상"
                  value={snap.design.blockTextColor}
                  onChange={(v) => patchDesign({ blockTextColor: v })}
                  onReset={() => patchDesign({ blockTextColor: null })}
                />
              </div>
            </>
          ) : null}

          {tab === 'settings' ? (
            <>
              <ToggleRow
                label="로고 숨기기"
                on={snap.design.hideLogo}
                onChange={(v) => patchDesign({ hideLogo: v })}
              />
              <div>
                <p className="mb-2 text-xs text-white/45">브랜드 로고</p>
                <button
                  type="button"
                  onClick={() => void pickImage('brand')}
                  className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 py-8 text-xs text-white/45"
                >
                  {snap.design.brandLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={snap.design.brandLogoUrl} alt="" className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5" />
                      JPG, PNG, WebP · 최대 4MB
                    </>
                  )}
                </button>
              </div>

              <div className="border-t border-white/10 pt-3">
                <ToggleRow
                  label="한줄공지"
                  on={snap.design.noticeEnabled}
                  onChange={(v) => patchDesign({ noticeEnabled: v })}
                />
                {snap.design.noticeEnabled ? (
                  <div className="mt-2 space-y-2">
                    <input
                      value={snap.design.noticeText}
                      onChange={(e) => patchDesign({ noticeText: e.target.value })}
                      placeholder="방문자에게 알릴 소식"
                      className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none"
                    />
                    <ToggleRow
                      label="공지 흐르기"
                      on={snap.design.noticeMarquee}
                      onChange={(v) => patchDesign({ noticeMarquee: v })}
                    />
                    <input
                      value={snap.design.noticeUrl || ''}
                      onChange={(e) => patchDesign({ noticeUrl: e.target.value || null })}
                      placeholder="연결 주소 (https://…)"
                      className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none"
                    />
                  </div>
                ) : null}
              </div>

              <ToggleRow
                label="검색 기능"
                hint="방문자가 블록 내용을 검색할 수 있어요."
                on={snap.design.searchEnabled}
                onChange={(v) => patchDesign({ searchEnabled: v })}
              />
              <ToggleRow
                label="간단주소 사용"
                on={snap.simpleAddress}
                onChange={(v) => update({ simpleAddress: v })}
              />

              <div className="border-t border-white/10 pt-3">
                <p className="mb-2 text-sm font-medium">제휴 링크 안내</p>
                <ToggleRow
                  label="안내 표시"
                  on={snap.design.affiliateNoticeEnabled}
                  onChange={(v) => patchDesign({ affiliateNoticeEnabled: v })}
                />
                {snap.design.affiliateNoticeEnabled ? (
                  <div className="mt-2 space-y-3">
                    <div>
                      <textarea
                        value={snap.design.affiliateNoticeText}
                        onChange={(e) =>
                          patchDesign({
                            affiliateNoticeText: e.target.value.slice(0, 1000),
                          })
                        }
                        rows={4}
                        className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2.5 text-sm outline-none"
                      />
                      <p className="mt-1 text-right text-[10px] text-white/35">
                        {snap.design.affiliateNoticeText.length}/1,000
                      </p>
                    </div>
                    <div>
                      <p className="mb-2 text-xs text-white/45">안내 스타일</p>
                      <Segmented
                        value={snap.design.affiliateNoticeStyle}
                        onChange={(v) => patchDesign({ affiliateNoticeStyle: v })}
                        options={[
                          { id: 'banner', label: '최상단 배너' },
                          { id: 'card', label: '카드' },
                          { id: 'text', label: '텍스트' },
                        ]}
                      />
                    </div>
                    <ColorRow
                      label="안내 배경색"
                      value={snap.design.affiliateBgColor}
                      onChange={(v) => patchDesign({ affiliateBgColor: v })}
                      onReset={() => patchDesign({ affiliateBgColor: null })}
                    />
                    <ColorRow
                      label="안내 글자색"
                      value={snap.design.affiliateTextColor}
                      onChange={(v) => patchDesign({ affiliateTextColor: v })}
                      onReset={() => patchDesign({ affiliateTextColor: null })}
                    />
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {err ? <p className="text-sm text-rose-300">{err}</p> : null}
        </div>

        <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto bg-[#121214] p-4 lg:items-center lg:p-6">
          <ProfilePhonePreview
            name={snap.displayName || '이름'}
            bio={snap.bio}
            layout={snap.layout}
            fontSize={snap.fontSize}
            avatarUrl={snap.avatarUrl || accountImage}
            coverUrl={snap.coverUrl}
            live={live}
            sns={snap.sns}
            design={snap.design}
          />
        </div>
      </div>
      {showSns ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 p-4"
          onClick={() => setShowSns(false)}
          role="presentation"
        >
          <div
            className="max-h-[min(80vh,640px)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#16161a] p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="SNS 정보"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">SNS 정보</h3>
                <p className="mt-1 text-xs text-white/40">채널 주소나 아이디를 입력하세요.</p>
              </div>
              <button type="button" onClick={() => setShowSns(false)} className="rounded-lg p-1 text-white/40">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2.5">
              {SNS_PRESETS.map((p) => (
                <label key={p.kind} className="block space-y-1">
                  <span className="text-xs text-white/50">{p.label}</span>
                  <input
                    value={snsDraft[p.kind] || ''}
                    onChange={(e) => setSnsDraft((cur) => ({ ...cur, [p.kind]: e.target.value }))}
                    placeholder={p.placeholder}
                    className="w-full rounded-xl border border-white/10 bg-[var(--input-bg)] px-3 py-2 text-sm outline-none"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const next = [...snap.sns]
                for (const p of SNS_PRESETS) {
                  const url = resolveSnsUrl(p.kind, snsDraft[p.kind] || '')
                  if (!url) continue
                  const i = next.findIndex((s) => s.kind === p.kind)
                  const row = { id: i >= 0 ? next[i].id : crypto.randomUUID(), label: p.label, url, kind: p.kind }
                  if (i >= 0) next[i] = row
                  else next.push(row)
                }
                update({ sns: next })
                setShowSns(false)
              }}
              className="mt-4 w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white"
            >
              확인
            </button>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  )
}

export function emptyDesignSnapshot(partial?: Partial<DesignSnapshot>): DesignSnapshot {
  return {
    displayName: '',
    bio: '',
    layout: 'cover',
    fontSize: 'md',
    avatarUrl: '',
    coverUrl: '',
    sns: [],
    simpleAddress: true,
    ...partial,
    design: normalizeProfileDesign(partial?.design ?? DEFAULT_PROFILE_DESIGN),
  }
}
