'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { LayoutGrid, List, Moon, Sun } from 'lucide-react'
import { MostemLogo } from '@/components/mostem-logo'
import { TossLogo } from '@/components/toss-logo'
import { filterHotdealItems, tossDealEndAt, type HotdealFilter, type HotdealItem } from '@/lib/hotdeal'
import { cn } from '@/lib/utils'

export function HotdealStorefront({
  name,
  intro,
  categories,
  initialTheme,
  initialBg,
  initialLayout,
  items,
}: {
  name: string
  intro: string
  categories: string[]
  initialTheme: string
  initialBg: string
  initialLayout?: string
  items: HotdealItem[]
}) {
  const [theme, setTheme] = useState(initialTheme === 'toss' ? 'toss' : 'mostem')
  const [dark, setDark] = useState(initialBg !== 'light')
  const [grid, setGrid] = useState(initialLayout !== 'list')

  useEffect(() => {
    const style = new URLSearchParams(window.location.search).get('style')
    if (style === 'toss') setTheme('toss')
  }, [])

  useEffect(() => {
    if (initialLayout === 'grid') {
      setGrid(true)
      return
    }
    if (initialLayout === 'list') {
      setGrid(false)
      return
    }
    const wide = window.matchMedia('(min-width: 640px)')
    setGrid(wide.matches)
    const onChange = () => setGrid(wide.matches)
    wide.addEventListener('change', onChange)
    return () => wide.removeEventListener('change', onChange)
  }, [initialLayout])
  const [filter, setFilter] = useState<HotdealFilter>('all')
  const toss = theme === 'toss'

  const cats = useMemo(() => {
    if (categories.length) return categories
    return [...new Set(items.map((item) => item.category).filter(Boolean))] as string[]
  }, [categories, items])

  const chips = useMemo(() => {
    const next: { id: HotdealFilter; label: string }[] = [{ id: 'all', label: '전체' }]
    if (items.some((item) => item.timeSale)) next.push({ id: 'deal', label: '⏰ 하루특가' })
    if (items.some((item) => item.best)) next.push({ id: 'best', label: '🏆 BEST' })
    cats.forEach((cat) => next.push({ id: cat, label: cat }))
    return next
  }, [cats, items])

  const deals = items.filter((item) => item.timeSale)
  const best = items.filter((item) => item.best)

  function sectionId(id: HotdealFilter) {
    if (id === 'all') return 'deals'
    if (id === 'deal') return 'today-deals'
    if (id === 'best') return 'best'
    return `cat-${id}`
  }

  function applyTheme(next: 'mostem' | 'toss') {
    setTheme(next)
    const url = new URL(window.location.href)
    if (next === 'toss') url.searchParams.set('style', 'toss')
    else url.searchParams.delete('style')
    window.history.replaceState(null, '', url)
  }

  function goTo(id: HotdealFilter) {
    setFilter(id)
    const hash = sectionId(id)
    const el = document.getElementById(hash)
    if (el) {
      el.scrollIntoView({ behavior: 'auto', block: 'start' })
    }
    const url = new URL(window.location.href)
    url.hash = hash
    window.history.replaceState(null, '', url)
  }

  useEffect(() => {
    const raw = decodeURIComponent(window.location.hash.replace(/^#/, ''))
    if (!raw) return
    const match = chips.find((chip) => sectionId(chip.id) === raw)
    if (match) {
      setFilter(match.id)
      requestAnimationFrame(() => {
        document.getElementById(raw)?.scrollIntoView({ behavior: 'auto', block: 'start' })
      })
    }
  }, [chips])

  const dealItems = { id: 'deal' as const, label: '하루특가', show: deals.length > 0 }
  const bestItems = { id: 'best' as const, label: 'BEST', show: best.length > 0 }

  return (
    <article
      className={cn(
        'min-h-[100dvh]',
        dark ? 'bg-[#0b0b0d] text-white' : 'bg-[#f4f5f8] text-[#14161c]',
      )}
    >
      <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-end gap-2 px-4 pt-3 sm:px-6">
        <ToggleGroup dark={dark}>
          <ToggleBtn active={grid} dark={dark} onClick={() => setGrid(true)} label="격자형으로 보기">
            <LayoutGrid className="size-4" />
          </ToggleBtn>
          <ToggleBtn active={!grid} dark={dark} onClick={() => setGrid(false)} label="리스트형으로 보기">
            <List className="size-4" />
          </ToggleBtn>
        </ToggleGroup>
        <ToggleGroup dark={dark}>
          <ToggleBtn active={!dark} dark={dark} onClick={() => setDark(false)} label="밝은 배경으로 보기">
            <Sun className="size-4" />
          </ToggleBtn>
          <ToggleBtn active={dark} dark={dark} onClick={() => setDark(true)} label="어두운 배경으로 보기">
            <Moon className="size-4" />
          </ToggleBtn>
        </ToggleGroup>
        <ThemePills theme={theme} dark={dark} onChange={applyTheme} />
      </div>

      <aside
        className={cn(
          'mt-3 border-b px-4 py-2.5 text-center text-xs font-medium leading-5 sm:text-sm',
          dark
            ? 'border-amber-200/20 bg-amber-200/90 text-[#3b2a08]'
            : 'border-amber-300/50 bg-amber-100 text-[#3b2a08]',
        )}
      >
        본 페이지는 토스쇼핑 쉐어링크 활동의 일환으로, 상품 구매 시 일정액의 수수료를 제공받습니다.
      </aside>

      <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 sm:py-10">
        <section className={cn(toss ? 'text-center' : cn('rounded-[20px] border p-6 text-center sm:p-8', dark ? 'border-white/10 bg-white/[0.04]' : 'border-black/8 bg-white'))}>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{name}</h1>
          {intro ? (
            <p className={cn('mt-2 text-sm leading-6 sm:text-base', dark ? 'text-white/50' : 'text-black/45')}>
              {intro}
            </p>
          ) : null}
        </section>

        <div className={cn(toss ? 'mt-8 flex items-start gap-8' : '')}>
          {toss ? (
            <nav className="sticky top-6 hidden w-40 shrink-0 lg:block">
              {(dealItems.show || bestItems.show) ? (
                <div>
                  <p className={cn('text-xs font-semibold', dark ? 'text-white/35' : 'text-black/35')}>특가</p>
                  <div className="mt-1 flex flex-col">
                    {dealItems.show ? (
                      <SideLink active={filter === 'deal'} dark={dark} onClick={() => goTo('deal')}>
                        하루특가
                      </SideLink>
                    ) : null}
                    {bestItems.show ? (
                      <SideLink active={filter === 'best'} dark={dark} onClick={() => goTo('best')}>
                        BEST
                      </SideLink>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div className="mt-6">
                <p className={cn('text-xs font-semibold', dark ? 'text-white/35' : 'text-black/35')}>카테고리</p>
                <div className="mt-1 flex flex-col">
                  <SideLink active={filter === 'all'} dark={dark} onClick={() => goTo('all')}>
                    전체
                  </SideLink>
                  {cats.map((cat) => (
                    <SideLink key={cat} active={filter === cat} dark={dark} onClick={() => goTo(cat)}>
                      {cat}
                    </SideLink>
                  ))}
                </div>
              </div>
            </nav>
          ) : null}

          <div className="min-w-0 flex-1">
            <div
              className={cn(
                'sticky top-0 z-10 mt-6 flex flex-wrap gap-2 py-3',
                toss ? 'lg:hidden' : '',
                dark ? 'bg-[#0b0b0d]' : 'bg-[#f4f5f8]',
                toss && 'mt-0',
              )}
            >
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => goTo(chip.id)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold',
                    filter === chip.id
                      ? 'bg-[var(--accent)] text-white'
                      : dark
                        ? 'bg-white/10 text-white/60'
                        : 'bg-white text-black/55',
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {deals.length ? (
              <ProductSection
                id="today-deals"
                title="⏰ 하루특가"
                items={deals}
                grid={grid}
                toss={toss}
                dark={dark}
                timer
                rail
                endAt={tossDealEndAt(deals)}
              />
            ) : null}
            {best.length ? (
              <ProductSection id="best" title="🏆 BEST" items={best} grid={grid} toss={toss} dark={dark} />
            ) : null}
            {cats.map((cat) => {
              const rows = filterHotdealItems(items, cat)
              if (!rows.length) return null
              return (
                <ProductSection
                  key={cat}
                  id={`cat-${cat}`}
                  title={cat}
                  items={rows}
                  grid={grid}
                  toss={toss}
                  dark={dark}
                />
              )
            })}
            <ProductSection id="deals" title="📦 전체 핫딜 모음집" items={items} grid={grid} toss={toss} dark={dark} />
          </div>
        </div>

        <footer
          className={cn(
            'mt-12 flex flex-col items-center gap-2 border-t pt-6 text-center text-xs',
            dark ? 'border-white/10 text-white/35' : 'border-black/8 text-black/35',
          )}
        >
          <p>© {new Date().getFullYear()} {name.replace(/^🔥\s*/, '')}.</p>
          <a href="https://www.mostem.kr" className="inline-flex items-center gap-1.5 font-semibold">
            <MostemLogo size={16} rounded="lg" />
            Mostem
          </a>
        </footer>
      </div>
    </article>
  )
}

function ThemePills({
  theme,
  dark,
  onChange,
}: {
  theme: string
  dark: boolean
  onChange: (next: 'mostem' | 'toss') => void
}) {
  return (
    <div className={cn('flex items-center gap-1 rounded-full p-1', dark ? 'bg-white/8' : 'bg-white shadow-sm')}>
      <button
        type="button"
        onClick={() => onChange('mostem')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold',
          theme === 'mostem'
            ? 'bg-[var(--accent)] text-white'
            : dark
              ? 'text-white/60 hover:text-white'
              : 'text-black/55 hover:text-black',
        )}
      >
        <MostemLogo size={14} rounded="full" />
        일반 보기
      </button>
      <button
        type="button"
        onClick={() => onChange('toss')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold',
          theme === 'toss'
            ? 'bg-[var(--accent)] text-white'
            : dark
              ? 'text-white/60 hover:text-white'
              : 'text-black/55 hover:text-black',
        )}
      >
        <TossLogo size={14} />
        토스 UI
      </button>
    </div>
  )
}

function SideLink({
  active,
  dark,
  onClick,
  children,
}: {
  active: boolean
  dark: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 py-1.5 text-left text-sm',
        active ? 'font-semibold' : dark ? 'text-white/45 hover:text-white' : 'text-black/40 hover:text-black',
      )}
    >
      <CheckIcon checked={active} />
      {children}
    </button>
  )
}

function CheckIcon({ checked }: { checked: boolean }) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={cn('size-4 shrink-0', checked ? 'text-[#3182f6]' : 'text-current/40')}
      fill="currentColor"
      aria-hidden
    >
      {checked ? (
        <path d="M208 32H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16Zm-32.5 69.7-58.9 56.2a8 8 0 0 1-11.1.2l-24.7-24a8 8 0 1 1 11-11.6l19.1 18.6 53.4-51a8 8 0 0 1 11.2 11.6Z" />
      ) : (
        <path d="M208 32H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16Zm0 176H48V48h160Z" />
      )}
    </svg>
  )
}

function DealTimer({ endAt }: { endAt?: string }) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    const end = new Date(endAt || tossDealEndAt([]))
    const tick = () => {
      const left = Math.max(0, end.getTime() - Date.now())
      const h = Math.floor(left / 3_600_000)
      const m = Math.floor((left % 3_600_000) / 60_000)
      const s = Math.floor((left % 60_000) / 1000)
      const pad = (n: number) => String(n).padStart(2, '0')
      setLabel(`${pad(h)}:${pad(m)}:${pad(s)} 남음`)
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [endAt])

  if (!label) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-3 py-1 text-sm font-bold tabular-nums text-[#3b2a08]">
      ⏰ {label}
    </span>
  )
}

function ProductSection({
  id,
  title,
  items,
  grid,
  toss,
  dark,
  timer,
  rail,
  endAt,
}: {
  id?: string
  title: string
  items: HotdealItem[]
  grid: boolean
  toss: boolean
  dark: boolean
  timer?: boolean
  rail?: boolean
  endAt?: string
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-24 first:mt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-black">{title}</h2>
        {timer ? <DealTimer endAt={endAt} /> : null}
      </div>
      {rail ? (
        <HorizontalRail dark={dark}>
          {items.map((item) => (
            <div key={`${item.id}-${item.timeSale ? 'd' : 'b'}`} className="w-44 shrink-0 snap-start sm:w-52 lg:w-[calc((100%-2.25rem)/4)]">
              <ProductCard item={item} grid toss={toss} dark={dark} />
            </div>
          ))}
        </HorizontalRail>
      ) : (
        <ProductGrid items={items} grid={grid} toss={toss} dark={dark} />
      )}
    </section>
  )
}

function HorizontalRail({ children, dark }: { children: ReactNode; dark: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; left: number } | null>(null)

  return (
    <div
      ref={ref}
      onPointerDown={(event) => {
        if (event.pointerType !== 'mouse' || event.button !== 0 || !ref.current) return
        drag.current = { x: event.clientX, left: ref.current.scrollLeft }
        ref.current.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (!drag.current || !ref.current) return
        ref.current.scrollLeft = drag.current.left - (event.clientX - drag.current.x)
      }}
      onPointerUp={() => {
        drag.current = null
      }}
      className={cn(
        'mt-4 flex cursor-grab snap-x snap-mandatory gap-3 overflow-x-auto pb-3 active:cursor-grabbing',
        '[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:rounded-full',
        dark
          ? '[&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-thumb]:bg-white/35'
          : '[&::-webkit-scrollbar-track]:bg-black/10 [&::-webkit-scrollbar-thumb]:bg-black/30',
      )}
    >
      {children}
    </div>
  )
}

function ProductGrid({
  items,
  grid,
  toss,
  dark,
}: {
  items: HotdealItem[]
  grid: boolean
  toss: boolean
  dark: boolean
}) {
  return (
    <div
      className={cn(
        'mt-4',
        grid ? 'grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4' : 'space-y-3',
      )}
    >
      {items.map((item) => (
        <ProductCard key={`${item.id}-${item.timeSale ? 'd' : 'b'}`} item={item} grid={grid} toss={toss} dark={dark} />
      ))}
    </div>
  )
}

function ToggleGroup({ dark, children }: { dark: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex w-fit items-center gap-0.5 rounded-full p-1',
        dark ? 'bg-white/8' : 'bg-white shadow-sm',
      )}
    >
      {children}
    </div>
  )
}

function ToggleBtn({
  active,
  dark,
  onClick,
  label,
  children,
}: {
  active: boolean
  dark: boolean
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid size-8 place-items-center rounded-full',
        active
          ? 'bg-[var(--accent)] text-white'
          : dark
            ? 'text-white/70 hover:bg-white/10'
            : 'text-black/55 hover:bg-black/5',
      )}
    >
      {children}
    </button>
  )
}

function ProductCard({
  item,
  grid,
  toss,
  dark,
}: {
  item: HotdealItem
  grid: boolean
  toss: boolean
  dark: boolean
}) {
  const card = toss
    ? cn(grid ? 'flex flex-col' : 'flex gap-3')
    : cn(
        'block overflow-hidden rounded-[20px] border transition hover:-translate-y-0.5',
        dark ? 'border-white/10 bg-white/[0.04]' : 'border-black/8 bg-white shadow-sm',
        grid ? 'flex h-full flex-col gap-2 p-3' : 'flex gap-3 p-3',
      )

  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className={card}>
      <div
        className={cn(
          'relative overflow-hidden',
          toss ? 'rounded-2xl' : 'rounded-xl',
          toss && (dark ? 'bg-[#17181b]' : 'bg-[#f2f3f6]'),
          grid ? 'aspect-square' : 'h-24 w-24 shrink-0',
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        {item.discountRate ? (
          <span
            className={cn(
              'absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-black text-white shadow',
              toss ? 'bg-[#f04452]' : 'bg-[var(--accent)]',
            )}
          >
            {toss ? `${item.discountRate}% 특가` : `${item.discountRate}%`}
          </span>
        ) : null}
      </div>
      <div className={cn(grid ? (toss ? 'mt-2' : '') : 'min-w-0 flex-1')}>
        <p className={cn('line-clamp-2 leading-tight', toss ? 'min-h-[2.5rem] text-[13px] font-semibold' : 'text-sm font-medium')}>
          {item.title}
        </p>
        <CardBadges item={item} />
        <PriceRow item={item} dark={dark} toss={toss} />
      </div>
    </a>
  )
}

function CardBadges({ item }: { item: HotdealItem }) {
  const chips: { key: string; className: string; label: string }[] = []
  if (item.timeSale) {
    chips.push({ key: 'sale', className: 'bg-violet-600 text-white', label: '타임세일' })
  }
  if (item.bestRank) {
    chips.push({ key: 'best', className: 'bg-fuchsia-600 text-white', label: `BEST ${item.bestRank}위` })
  }
  if (item.megaDiscount) {
    chips.push({ key: 'mega', className: 'bg-amber-400 text-[#3b2a08]', label: '역대급 할인' })
  }
  if (!chips.length) return null

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {chips.map((chip) => (
        <span key={chip.key} className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', chip.className)}>
          {chip.label}
        </span>
      ))}
    </div>
  )
}

function PriceRow({ item, dark, toss }: { item: HotdealItem; dark: boolean; toss: boolean }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
      <span className={cn('text-sm font-black tabular-nums', !toss && 'text-[var(--accent)]')}>{item.priceText}</span>
      {item.listPriceText ? (
        <span className={cn('text-xs tabular-nums line-through', dark ? 'text-white/40' : 'text-black/40')}>
          {item.listPriceText}
        </span>
      ) : null}
    </div>
  )
}
