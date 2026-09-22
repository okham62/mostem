'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  BarChart3,
  CircleHelp,
  Clapperboard,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  LayoutGrid,
  Lightbulb,
  Loader2,
  MessageSquare,
  Newspaper,
  Play,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlogInsightSection, BlogKeywordInsight } from '@/lib/blog-keyword-insight-types'

function formatVolume(n: number) {
  return n.toLocaleString('ko-KR')
}

const SECTION_UI: Record<
  string,
  { label: string; bg: string; Icon: typeof LayoutGrid }
> = {
  web: { label: '기타', bg: 'bg-[#5c6570]', Icon: LayoutGrid },
  misc: { label: '기타', bg: 'bg-[#5c6570]', Icon: LayoutGrid },
  image: { label: '이미지', bg: 'bg-[#7c5cff]', Icon: ImageIcon },
  blog: { label: '블로그', bg: 'bg-[#2f9e44]', Icon: FileText },
  clip: { label: '클립', bg: 'bg-[#e64980]', Icon: Clapperboard },
  cafe: { label: '카페', bg: 'bg-[#c27803]', Icon: MessageSquare },
  kin: { label: '지식iN', bg: 'bg-[#0ca678]', Icon: CircleHelp },
  video: { label: '동영상', bg: 'bg-[#e03131]', Icon: Video },
  shopping: { label: '쇼핑', bg: 'bg-[#7950f2]', Icon: ShoppingBag },
  news: { label: '뉴스', bg: 'bg-[#1971c2]', Icon: Newspaper },
  influence: { label: '인플', bg: 'bg-[#ae3ec9]', Icon: Sparkles },
  book: { label: '책', bg: 'bg-[#868e96]', Icon: FileText },
  local: { label: '지역', bg: 'bg-[#7048e8]', Icon: LayoutGrid },
}

function sectionMeta(section: BlogInsightSection) {
  return (
    SECTION_UI[section.id] || {
      label: section.label === '통합' ? '기타' : section.label,
      bg: 'bg-[#5c6570]',
      Icon: LayoutGrid,
    }
  )
}

function SectionOrderPanel({
  keyword,
  device,
  sections,
  advice,
  onDeviceChange,
  className,
}: {
  keyword: string
  device: 'pc' | 'mobile'
  sections: BlogInsightSection[]
  advice: string
  onDeviceChange: (d: 'pc' | 'mobile') => void
  className?: string
}) {
  const top = sections.slice(0, 3).map((s) => sectionMeta(s).label)
  return (
    <section
      className={cn(
        'min-w-0 rounded-2xl border border-white/10 bg-[#14181d] p-4 md:p-5',
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-sm font-semibold text-white">
            섹션 배치 순서{' '}
            <span className="font-normal text-white/45">(네이버 검색 결과 상단 기준)</span>
          </h3>
          <span
            title="네이버 통합검색 상단에 노출되는 영역 순서를 분석합니다."
            className="inline-flex shrink-0 text-white/35"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="inline-flex shrink-0 rounded-lg bg-white/5 p-0.5">
          {(['pc', 'mobile'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDeviceChange(d)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition',
                device === d
                  ? 'bg-[#9ADE44] text-[#1a1f16]'
                  : 'text-white/45 hover:text-white/70'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="flex w-full flex-nowrap items-start justify-between gap-1 overflow-x-auto pb-0.5">
        {sections.slice(0, 8).map((s) => {
          const meta = sectionMeta(s)
          const Icon = meta.Icon
          return (
            <div
              key={`${s.id}-${s.order}`}
              className="flex w-0 min-w-[48px] flex-1 flex-col items-center gap-1"
            >
              <span className="text-[10px] font-medium text-white/40">{s.order}</span>
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm sm:h-10 sm:w-10 sm:rounded-2xl',
                  meta.bg
                )}
              >
                <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2.2} />
              </div>
              <span className="max-w-full truncate text-center text-[10px] font-medium text-white/75 sm:text-[11px]">
                {meta.label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex items-start gap-2 border-t border-white/10 pt-3 text-xs leading-relaxed text-white/55">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
        <p className="min-w-0">
          한눈에 보는 인사이트 ·{' '}
          <span className="font-semibold text-white">&apos;{keyword}&apos;</span> 는{' '}
          {top.length ? (
            <>
              {top.map((label, i) => (
                <span key={`${label}-${i}`}>
                  {i > 0 ? ' + ' : ''}
                  <span className="font-semibold text-[#9ADE44]">{label}</span>
                </span>
              ))}{' '}
              콘텐츠가 유리합니다.
            </>
          ) : (
            <span>{advice}</span>
          )}{' '}
          · <span className="text-white/40">추천</span>
        </p>
      </div>
    </section>
  )
}

function Sparkline({ values }: { values: number[] }) {
  if (!values.length) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = Math.max(1, max - min)
  // Keep stroke inside viewBox — pad top/bottom so line isn't clipped.
  const padX = 1
  const padY = 4
  const innerW = 100 - padX * 2
  const innerH = 36 - padY * 2
  const points = values
    .map((v, i) => {
      const x = padX + (i / Math.max(1, values.length - 1)) * innerW
      const y = padY + (1 - (v - min) / span) * innerH
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
  return (
    <svg
      viewBox="0 0 100 36"
      className="h-10 w-full overflow-visible"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        points={points}
        className="text-emerald-400"
      />
    </svg>
  )
}

function Card({
  title,
  children,
  className,
  action,
}: {
  title: string
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]',
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

export function KeywordInsightPanel({
  naverBlogConnected,
}: {
  naverBlogConnected: boolean
}) {
  const [q, setQ] = useState('')
  const [device, setDevice] = useState<'pc' | 'mobile'>('pc')
  const [trendTab, setTrendTab] = useState<'youtube' | 'naverHome' | 'googleDiscover'>('youtube')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [insight, setInsight] = useState<BlogKeywordInsight | null>(null)

  async function analyze(nextQ = q, nextDevice = device) {
    const keyword = nextQ.trim()
    if (!keyword) {
      setError('키워드를 입력하세요')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch(
        `/api/blog/keyword-insight?q=${encodeURIComponent(keyword)}&device=${nextDevice}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '분석 실패')
      setInsight(data.insight as BlogKeywordInsight)
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석 실패')
    } finally {
      setBusy(false)
    }
  }

  const updatedLabel = useMemo(() => {
    if (!insight?.analyzedAt) return ''
    const diff = Date.now() - new Date(insight.analyzedAt).getTime()
    const min = Math.max(1, Math.round(diff / 60_000))
    return `${min}분 전`
  }, [insight?.analyzedAt])

  const trendItems =
    trendTab === 'youtube'
      ? insight?.trends.youtube ?? []
      : trendTab === 'naverHome'
        ? insight?.trends.naverHome ?? []
        : insight?.trends.googleDiscover ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">AI 키워드 인사이트</h1>
          <p className="mt-1 text-sm text-white/45">
            검색량·경쟁·섹션 배치·연관어를 한 화면에서 분석합니다.
          </p>
        </div>
        {insight ? (
          <p className="text-[11px] text-white/35">
            업데이트 {updatedLabel} · 소스 {insight.sourceCount} · 분석 완료
          </p>
        ) : null}
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void analyze()
        }}
      >
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="키워드 입력"
            className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-400/50"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          분석 시작
        </button>
      </form>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {!insight && !busy ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <p className="text-sm text-white/55">키워드를 입력한 뒤 분석 시작을 눌러 주세요.</p>
          <p className="mt-2 text-xs text-white/35">
            섹션 배치 · 등급 · 검색량 · 연관어 · 트렌드가 이 아래에 표시됩니다.
          </p>
        </div>
      ) : null}

      {!insight && busy ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-white/45">
          <Loader2 className="h-4 w-4 animate-spin" /> 키워드 분석 중…
        </div>
      ) : null}

      {insight ? (
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-12">
          {/* Row 1: 섹션 | 등급 | 검색량 */}
          <SectionOrderPanel
            className="lg:col-span-6"
            keyword={insight.keyword}
            device={device}
            sections={insight.sections}
            advice={insight.sectionAdvice}
            onDeviceChange={(d) => {
              setDevice(d)
              void analyze(insight.keyword, d)
            }}
          />

          <Card title="키워드 등급" className="min-w-0 lg:col-span-3">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-3xl font-black text-sky-300">
                {insight.grade}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  진입 가능성 {insight.entryScore}/100
                </p>
                <p className="mt-1 text-xs text-white/45">({insight.entryLabel})</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/50">{insight.gradeAdvice}</p>
          </Card>

          <Card title="검색량 & 경쟁 강도" className="min-w-0 lg:col-span-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0">
                <p className="text-xs text-white/40">월간 검색량(추정)</p>
                <p className="mt-1 truncate text-xl font-bold text-white sm:text-2xl">
                  {formatVolume(insight.searchVolume)}
                </p>
                <p
                  className={cn(
                    'mt-1 text-xs font-medium',
                    insight.volumeChangePct >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  )}
                >
                  {insight.volumeChangePct >= 0 ? '+' : ''}
                  {insight.volumeChangePct}%
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white/40">경쟁 강도</p>
                <p className="mt-1 text-xl font-bold text-white sm:text-2xl">
                  {insight.competitionScore}/100
                </p>
                <div className="mt-2 text-emerald-300/90">
                  <Sparkline values={insight.spark} />
                </div>
              </div>
            </div>
          </Card>

          {/* Row 2: 연관 | 롱테일 | 블로그 */}
          <Card title="연관 키워드 분석" className="min-w-0 lg:col-span-4">
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {insight.related.map((r) => (
                <li
                  key={r.keyword}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-2.5 py-2"
                >
                  <button
                    type="button"
                    className="truncate text-left text-sm text-white hover:text-emerald-300"
                    onClick={() => {
                      setQ(r.keyword)
                      void analyze(r.keyword, device)
                    }}
                  >
                    {r.keyword}
                  </button>
                  <div className="flex shrink-0 items-center gap-2 text-[11px]">
                    <span className="text-white/45">{formatVolume(r.volume)}</span>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 font-semibold',
                        r.competition === '높음'
                          ? 'bg-rose-500/20 text-rose-300'
                          : r.competition === '보통'
                            ? 'bg-amber-500/20 text-amber-200'
                            : 'bg-emerald-500/20 text-emerald-300'
                      )}
                    >
                      {r.competition}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="추천 롱테일 키워드" className="min-w-0 lg:col-span-4">
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {insight.longTail.map((r) => (
                <li key={r.keyword} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-white/80">{r.keyword}</span>
                  <span className="text-[11px] text-white/40">{formatVolume(r.volume)}</span>
                </li>
              ))}
              {!insight.longTail.length ? (
                <li className="text-xs text-white/35">롱테일 후보가 충분하지 않습니다.</li>
              ) : null}
            </ul>
          </Card>

          <Card title="추천 블로그 키워드" className="min-w-0 lg:col-span-4">
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {insight.blogKeywords.map((r) => (
                <li
                  key={r.keyword}
                  className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2.5 py-2"
                >
                  <span className="truncate text-sm text-white/85">{r.keyword}</span>
                  <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[11px] font-bold text-sky-300">
                    {r.score}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Row 3: 후킹 | 트렌드 */}
          <Card
            title="후킹 키워드"
            className="min-w-0 lg:col-span-7"
            action={<Newspaper className="h-3.5 w-3.5 text-white/35" />}
          >
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {insight.hooks.map((h) => (
                <li key={h.url}>
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-white/5 bg-black/20 px-3 py-2 hover:border-white/15"
                  >
                    <p className="line-clamp-2 text-sm text-white/90">{h.title}</p>
                    <p className="mt-1 text-[11px] text-white/35">{h.source || '뉴스'}</p>
                  </a>
                </li>
              ))}
              {!insight.hooks.length ? (
                <li className="text-xs text-white/35">관련 이슈 뉴스를 찾지 못했습니다.</li>
              ) : null}
            </ul>
          </Card>

          <Card
            title="실시간 트렌드 분석"
            className="min-w-0 lg:col-span-5"
            action={
              trendTab === 'youtube' ? (
                <Play className="h-3.5 w-3.5 text-white/35" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5 text-white/35" />
              )
            }
          >
            <div className="mb-3 flex flex-wrap gap-1">
              {(
                [
                  ['youtube', '유튜브 인기'],
                  ['naverHome', '네이버 홈'],
                  ['googleDiscover', '구글 디스커버'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTrendTab(id)}
                  className={cn(
                    'rounded-md px-2 py-1 text-[11px] font-medium',
                    trendTab === id ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/40'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <ul className="max-h-60 space-y-2 overflow-y-auto">
              {trendItems.map((t) => (
                <li key={t.url}>
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg bg-black/20 px-2.5 py-2 hover:bg-white/5"
                  >
                    <p className="line-clamp-2 text-sm text-white/85">{t.title}</p>
                    {t.meta ? <p className="mt-0.5 text-[11px] text-white/35">{t.meta}</p> : null}
                  </a>
                </li>
              ))}
              {!trendItems.length ? (
                <li className="text-xs text-white/35">표시할 트렌드가 없습니다.</li>
              ) : null}
            </ul>
          </Card>

          {/* Row 4: 출처 | 수집 | 내 블로그 | 상태 */}
          <Card title="주요 출처 분포" className="min-w-0 lg:col-span-3">
            <ul className="space-y-2">
              {insight.sources.map((s) => (
                <li key={s.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-white/70">{s.label}</span>
                    <span className="text-white/45">{s.pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-400/80"
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="데이터 수집 현황" className="min-w-0 lg:col-span-3">
            <div className="space-y-3">
              {(
                [
                  ['24시간', insight.collected.h24],
                  ['48시간', insight.collected.h48],
                  ['72시간', insight.collected.h72],
                ] as const
              ).map(([label, count]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs text-white/55">
                    <span>{label}</span>
                    <span>{count}건 수집</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-sky-400/80"
                      style={{
                        width: `${Math.min(100, Math.round((count / Math.max(insight.collected.h72, 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="내 블로그 인사이트"
            className="min-w-0 lg:col-span-3"
            action={<BarChart3 className="h-3.5 w-3.5 text-white/35" />}
          >
            {naverBlogConnected ? (
              <div className="space-y-2 text-xs text-white/55">
                <p>유입 도메인 · 콘텐츠 순위 · 유입 키워드 분석을 준비 중입니다.</p>
                <p className="text-emerald-300/80">네이버 블로그 계정이 연결되어 있습니다.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-3 text-xs text-amber-100/90">
                Blog ID가 설정되지 않았습니다. 블로그 설정에서 네이버 Blog ID를 입력해 주세요.
              </div>
            )}
            <button
              type="button"
              onClick={() => void analyze(insight.keyword, device)}
              className="mt-3 inline-flex items-center gap-1 text-[11px] text-white/45 hover:text-white/70"
            >
              <RefreshCw className="h-3 w-3" /> 다시 분석
            </button>
          </Card>

          <Card title="내 블로그 현황 (BETA)" className="min-w-0 lg:col-span-3">
            <p className="text-xs text-white/40">
              {naverBlogConnected
                ? '방문자·글자수 분석을 준비 중입니다.'
                : 'Blog ID 연동 후 방문자·글자수 현황을 표시합니다.'}
            </p>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
