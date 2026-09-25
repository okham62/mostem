'use client'

import { useMemo, useState, type ReactNode }
import { LayoutGrid, List, Moon, ShoppingBag, Sun } from 'lucide-react'
import { MostemLogo } from '@/components/mostem-logo'
import { filterHotdealItems, type HotdealFilter, type HotdealItem } from '@/lib/hotdeal'
import { cn } from '@/lib/utils'

export function HotdealStorefront({
  name,
  intro,
  categories,
  initialTheme,
  initialBg,
  items,
}: {
  name: string
  intro: string
  categories: string[]
  initialTheme: string
  initialBg: string
  items: HotdealItem[]
}) {
  const [theme, setTheme] = useState(initialTheme === 'toss' ? 'toss' : 'mostem')
  const [dark, setDark] = useState(initialBg !== 'light')
  const [grid, setGrid] = useState(true)
  const [filter, setFilter] = useState<HotdealFilter>('all')
  const toss = theme === 'toss'

  const chips = useMemo(() => {
    const next: { id: HotdealFilter; label: string }[] = [{ id: 'all', label: '전체' }]
    if (items.some((item) => item.timeSale)) next.push({ id: 'deal', label: '⏰ 하루특가' })
    if (items.some((item) => item.best)) next.push({ id: 'best', label: '🏆 BEST' })
    const cats = categories.length
      ? categories
      : [...new Set(items.map((item) => item.category).filter(Boolean))] as string[]
    cats.forEach((cat) => next.push({ id: cat, label: cat }))
    return next
  }, [categories, items])

  const visible = filterHotdealItems(items, filter)
  const section =
    filter === 'deal' ? '⏰ 하루특가' : filter === 'best' ? '🏆 BEST' : filter === 'all' ? '' : filter

  return (
    <div
      className={cn(
        'min-h-screen',
        dark ? 'bg-[#0b0b0d] text-white' : 'bg-[#f4f5f8] text-[#14161c]',
      )}
    >
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            <IconBtn active={grid} dark={dark} onClick={() => setGrid(true)} label="격자형으로 보기">
              <LayoutGrid className="size-4" />
            </IconBtn>
            <IconBtn active={!grid} dark={dark} onClick={() => setGrid(false)} label="리스트형으로 보기">
              <List className="size-4" />
            </IconBtn>
          </div>
          <IconBtn active={false} dark={dark} onClick={() => setDark((v) => !v)} label={dark ? '밝은 배경으로 보기' : '어두운 배경으로 보기'}>
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </IconBtn>
        </div>

        <p
          className={cn(
            'rounded-2xl px-4 py-3 text-xs leading-relaxed',
            dark ? 'bg-white/5 text-white/50' : 'bg-white text-black/45',
          )}
        >
          본 페이지는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTheme('mostem')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs',
              theme === 'mostem'
                ? 'bg-[var(--accent)] text-white'
                : dark
                  ? 'bg-white/10 text-white/60'
                  : 'bg-white text-black/55',
            )}
          >
            <MostemLogo size={14} rounded="full" />
            모스템 보기
          </button>
          <button
            type="button"
            onClick={() => setTheme('toss')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs',
              theme === 'toss'
                ? 'bg-[var(--accent)] text-white'
                : dark
                  ? 'bg-white/10 text-white/60'
                  : 'bg-white text-black/55',
            )}
          >
            <ShoppingBag className="size-3.5" />
            토스 UI
          </button>
        </div>

        <header className="mt-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
          {intro ? (
            <p className={cn('mt-2 text-sm', dark ? 'text-white/50' : 'text-black/45')}>{intro}</p>
          ) : null}
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs',
                filter === chip.id
                  ? 'bg-[var(--accent)] text-white'
                  : dark
                    ? 'bg-white/8 text-white/60'
                    : 'bg-white text-black/55',
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {section ? <h2 className="mt-8 text-lg font-semibold">{section}</h2> : null}

        <div className={cn('mt-4', grid ? 'grid grid-cols-2 gap-3' : 'space-y-3')}>
          {visible.map((item) => (
            <ProductCard key={item.id} item={item} grid={grid} toss={toss} dark={dark} />
          ))}
        </div>

        {!visible.length ? (
          <p className={cn('mt-10 text-center text-sm', dark ? 'text-white/40' : 'text-black/40')}>
            이 조건에 맞는 상품이 아직 없어요.
          </p>
        ) : null}

        <div className={cn('mt-12 flex items-center justify-center gap-2 text-xs', dark ? 'text-white/30' : 'text-black/30')}>
          <MostemLogo size={18} rounded="lg" />
          Mostem 핫딜
        </div>
      </div>
    </div>
  )
}

function IconBtn({
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
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid size-9 place-items-center rounded-full',
        active
          ? 'bg-[var(--accent)] text-white'
          : dark
            ? 'bg-white/8 text-white/70'
            : 'bg-white text-black/55 shadow-sm',
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
    'block overflow-hidden transition',
    toss ? 'rounded-md border' : 'rounded-2xl border',
    dark
      ? toss
        ? 'border-white/15 bg-[#111214]'
        : 'border-white/10 bg-white/[0.04]'
      : toss
        ? 'border-black/10 bg-white'
        : 'border-black/8 bg-white shadow-sm',
    grid ? '' : 'flex gap-3 p-3',
  )

  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className={card}>
      <div className={cn('relative overflow-hidden', grid ? 'aspect-square' : 'h-24 w-24 shrink-0 rounded-xl')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image} alt="" className="h-full w-full object-cover" />
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
      <div className={cn(grid ? 'p-3' : 'min-w-0 flex-1')}>
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
