'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { formatKeywordTime } from '@/lib/keywords'
import {
  type ShoppingList,
  type ShoppingPayload,
  type ShoppingPlatformBoard,
  type ShoppingProduct,
} from '@/lib/shopping'
import { fetchShopping, peekShoppingCache } from '@/lib/shopping-cache'
import { cn } from '@/lib/utils'
import { logWork } from '@/lib/client-log'
import { ShoppingSkeleton } from './shopping-skeleton'

const POLL_MS = 60_000

export function ShoppingClient() {
  const [data, setData] = useState<ShoppingPayload | null>(null)
  const [refreshing, setRefreshing] = useState(false)

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

  const naver = data.platforms.find((item) => item.id === 'naver')
  const coupang = data.platforms.find((item) => item.id === 'coupang')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white md:text-2xl">쇼핑 베스트</h1>
          <p className="mt-1 text-sm text-white/45">{formatKeywordTime(data.now)}</p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          새로고침
        </button>
      </div>

      <PlatformPanel board={naver} empty="네이버쇼핑 상품을 불러오지 못했습니다." />
      <PlatformPanel board={coupang} empty="쿠팡 상품을 불러오지 못했습니다." />

      <p className="pb-2 text-[11px] text-white/30">
        데이터 출처: 네이버 쇼핑 BEST · 쿠팡은 실시간 쇼핑 키워드 기준으로 추천합니다
      </p>
    </div>
  )
}

function PlatformPanel({
  board,
  empty,
}: {
  board?: ShoppingPlatformBoard
  empty: string
}) {
  if (!board) {
    return (
      <section>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] py-16 text-center text-sm text-white/40">
          {empty}
        </div>
      </section>
    )
  }

  const accent = board.id === 'coupang' ? 'text-red-400' : 'text-brand'

  return (
    <section className="space-y-5">
      <div>
        <h2 className={cn('text-lg font-bold', accent)}>{board.label}</h2>
        <p className="mt-0.5 text-xs text-white/40">{board.hint}</p>
      </div>
      <ProductSection list={board.rising} platform={board.label} />
      <ProductSection list={board.popular} platform={board.label} />
    </section>
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
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">{list.label}</h3>
        <p className="mt-0.5 text-[11px] text-white/40">{list.hint}</p>
      </div>
      {list.products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-white/40">
          {list.error || '상품이 없습니다.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
