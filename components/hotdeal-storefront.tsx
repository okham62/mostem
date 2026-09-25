'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { LayoutGrid, List, Moon, Sun } from 'lucide-react'
import { MostemLogo } from '@/components/mostem-logo'
import { TossLogo } from '@/components/toss-logo'
import { filterHotdealItems, type HotdealFilter, type HotdealItem } from '@/lib/hotdeal'
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

  function goTo(id: HotdealFilter) {
    setFilter(id)
    const hash = sectionId(id)
    const el = document.getElementById(hash)
    if (el) {
      el.scrollIntoView({ behavior: 'auto', block: 'start' })
    }
    window.history.replaceState(null, '', `#${hash}`)
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

  return (
    <article
      className={cn(
        'min-h-[100dvh]',
        dark ? 'bg-[#0b0b0d] text-white' : 'bg-[#f4f5f8] text-[#14161c]',
      )}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-end gap-2 px-4 pt-3 sm:px-6">
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

      <div
        className={cn(
          'flex flex-wrap items-center justify-center gap-2 border-b px-4 py-2.5',
          dark ? 'border-white/10 bg-white/[0.04]' : 'border-black/8 bg-white',
        )}
      >
        <button
          type="button"
          onClick={() => setTheme('mostem')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold',
            theme === 'mostem'
              ? 'bg-[var(--accent)] text-white'
              : dark
                ? 'bg-white/10 text-white/60'
                : 'bg-[#f4f5f8] text-black/55',
          )}
        >
          <MostemLogo size={14} rounded="full" />
          일반 보기
        </button>
        <button
          type="button"
          onClick={() => setTheme('toss')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold',
            theme === 'toss'
              ? 'bg-[var(--accent)] text-white'
              : dark
                ? 'bg-white/10 text-white/60'
                : 'bg-[#f4f5f8] text-black/55',
          )}
        >
          <TossLogo size={14} />
          토스 UI
        </button>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <section
          className={cn(
            'rounded-[20px] border p-6 text-center sm:p-8',
            dark ? 'border-white/10 bg-white/[0.04]' : 'border-black/8 bg-white',
          )}
        >
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{name}</h1>
          {intro ? (
            <p className={cn('mt-2 text-sm leading-6 sm:text-base', dark ? 'text-white/50' : 'text-black/45')}>
              {intro}
            </p>
          ) : null}
        </section>

        <div
          className={cn(
            'sticky top-0 z-10 mt-6 flex flex-wrap gap-2 py-3',
            dark ? 'bg-[#0b0b0d]' : 'bg-[#f4f5f8]',
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
          <ProductSection id="today-deals" title="⏰ 하루특가" items={deals} grid={grid} toss={toss} dark={dark} />
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

function ProductSection({
  id,
  title,
  items,
  grid,
  toss,
  dark,
}: {
  id?: string
  title: string
  items: HotdealItem[]
  grid: boolean
  toss: boolean
  dark: boolean
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <h2 className="text-xl font-black">{title}</h2>
      <ProductGrid items={items} grid={grid} toss={toss} dark={dark} />
    </section>
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
        grid ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4' : 'space-y-3',
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
  const card = cn(
    'block overflow-hidden transition hover:-translate-y-0.5',
    toss ? 'rounded-md border' : 'rounded-[20px] border',
    dark
      ? toss
        ? 'border-white/15 bg-[#111214]'
        : 'border-white/10 bg-white/[0.04]'
      : toss
        ? 'border-black/10 bg-white'
        : 'border-black/8 bg-white shadow-sm',
    grid ? 'flex h-full flex-col gap-2 p-3' : 'flex gap-3 p-3',
  )

  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className={card}>
      <div className={cn('relative overflow-hidden rounded-xl', grid ? 'aspect-square' : 'h-24 w-24 shrink-0')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        {item.discountRate ? (
          <span
            className={cn(
              'absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white',
              toss ? 'bg-red-500' : 'bg-[var(--accent)]',
            )}
          >
            {item.discountRate}%
          </span>
        ) : null}
      </div>
      <div className={cn(grid ? '' : 'min-w-0 flex-1')}>
        <div className="mb-1.5 flex flex-wrap gap-1">
          {item.timeSale ? <Badge dark={dark}>⏱️ 타임세일</Badge> : null}
          {item.megaDiscount ? (
            <Badge dark={dark}>💥 역대급 할인</Badge>
          ) : item.bigDiscount ? (
            <Badge dark={dark}>🔥 {item.discountRate}% 할인</Badge>
          ) : null}
          {item.best ? <Badge dark={dark}>🏆 BEST</Badge> : null}
        </div>
        <p className="line-clamp-2 text-sm font-medium leading-snug">{item.title}</p>
        <p className={cn('mt-1.5 text-sm font-semibold', toss ? 'text-red-500' : 'text-[var(--accent)]')}>
          {item.priceText}
        </p>
        {item.listPriceText ? (
          <p className={cn('text-xs line-through', dark ? 'text-white/35' : 'text-black/35')}>
            {item.listPriceText}
          </p>
        ) : null}
      </div>
    </a>
  )
}

function Badge({ children, dark }: { children: ReactNode; dark: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[10px]',
        dark ? 'bg-white/10 text-white/80' : 'bg-black/5 text-black/65',
      )}
    >
      {children}
    </span>
  )
}
