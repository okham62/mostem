'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { formatKeywordTime } from '@/lib/keywords'
import {
  type ShoppingList,
  type ShoppingListId,
  type ShoppingPayload,
  type ShoppingPlatform,
  type ShoppingProduct,
} from '@/lib/shopping'
import { fetchShopping, peekShoppingCache } from '@/lib/shopping-cache'
import { cn } from '@/lib/utils'
import { logWork } from '@/lib/client-log'
import { ShoppingSkeleton } from './shopping-skeleton'

const POLL_MS = 60_000

const TABS: { id: string; platform: ShoppingPlatform; list: ShoppingListId; label: string }[] = [
  { id: 'naver-rising', platform: 'naver', list: 'rising', label: '네이버 판매급상승' },
  { id: 'naver-popular', platform: 'naver', list: 'popular', label: '네이버 판매인기상품' },
  { id: 'coupang-rising', platform: 'coupang', list: 'rising', label: '쿠팡 판매급상승' },
  { id: 'coupang-popular', platform: 'coupang', list: 'popular', label: '쿠팡 판매인기상품' },
]

export function ShoppingClient() {
  const [data, setData] = useState<ShoppingPayload | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState(TABS[0].id)

  async function reload() {
    setRefreshing(true)
    try {
      setData(await fetchShopping())
    } finally {
      setRefreshing(false)
    }
  }

  useLayoutEffect(() => {
    const cached = peekShoppingCache()
    if (cached) setData(cached)
  }, [])

  useEffect(() => {
    void reload()
    const tick = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    const id = window.setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  if (!data) return <ShoppingSkeleton />

  const current = TABS.find((item) => item.id === tab) ?? TABS[0]
  const board = data.platforms.find((item) => item.id === current.platform)
  const list = current.list === 'rising' ? board?.rising : board?.popular

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-white/45">{formatKeywordTime(data.now)}</p>
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          새로고침
        </button>
      </div>

      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'h-10 shrink-0 rounded-lg px-3 text-sm font-semibold transition',
              tab === item.id
                ? 'mostem-filter-btn'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {list ? (
        <ProductSection list={list} platform={board?.label || current.label} />
      ) : (
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] py-16 text-center text-sm text-white/40">
          상품을 불러오지 못했습니다.
        </div>
      )}

      <p className="pb-2 text-[11px] text-white/30">
        데이터 출처: 네이버 쇼핑 BEST · 쿠팡은 실시간 쇼핑 키워드 기준으로 추천합니다
      </p>
    </div>
  )
}

function ProductSection({
  list,
  platform,
}: {
  list: ShoppingList
  platform: string
}) {
  return (
    <div>
      {list.products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-white/40">
          {list.error || '상품이 없습니다.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {list.products.map((item) => (
            <ProductCard key={`${list.id}-${item.rank}-${item.title}`} item={item} platform={platform} list={list.label} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductCard({
  item,
  platform,
  list,
}: {
  item: ShoppingProduct
  platform: string
  list: string
}) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      onClick={() =>
        logWork('shopping_open', {
          title: item.title,
          rank: item.rank,
          platform,
          list,
          url: item.url,
        })
      }
      className="group overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] transition hover:border-white/20"
    >
      <div className="relative aspect-[16/9] bg-black/40">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-white/30">이미지 없음</div>
        )}
        <span
          className={cn(
            'absolute left-2 top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[11px] font-bold',
            item.rank <= 3 ? 'bg-gold text-black' : 'bg-black/70 text-white'
          )}
        >
          {item.rank}
        </span>
        {item.discountRate ? (
          <span className="absolute right-2 top-2 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {item.discountRate}%
          </span>
        ) : null}
      </div>
      <div className="space-y-2 p-3.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">{item.title}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-gold">{item.priceText || '가격 문의'}</span>
          {item.listPrice ? (
            <span className="text-[10px] text-white/30 line-through">
              {item.listPrice.toLocaleString('ko-KR')}원
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-2 text-[10px] text-white/40">
          <span className="truncate">{item.mall}</span>
          <span className="inline-flex shrink-0 items-center gap-1">
            {item.reviewScore ? <span>★ {item.reviewScore}</span> : null}
            {item.reviewCount ? <span>({item.reviewCount})</span> : null}
            <ExternalLink className="h-3 w-3 text-white/25" />
          </span>
        </div>
      </div>
    </a>
  )
}
