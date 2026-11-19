import { getRealtimeKeywords } from '@/lib/keywords'
import { getCategoryNews } from '@/lib/news-categories'
import { getShoppingTrends } from '@/lib/trends'
import { getShoppingBest } from '@/lib/shopping'
import { getMarkets } from '@/lib/markets'
import { sharedCache } from '@/lib/shared-cache'

/*
 * Menu data that is the same for every user, served from the cache shared by all server instances.
 * Each entry answers instantly from the last good copy and refreshes in the background.
 */

/** 실시간 키워드 (네이버 + 구글) — 30s. */
export const getSharedRealtimeKeywords = sharedCache(
  'realtime-keywords-v1',
  30,
  () => getRealtimeKeywords('full'),
  (data) => Boolean(data.sources?.some((source) => source.keywords.length > 0)),
)

/** 실시간 뉴스 (카테고리별) — 60s. */
export const getSharedCategoryNews = sharedCache(
  'category-news-v1',
  60,
  getCategoryNews,
  (data) => data.news.length > 0,
)

/** 트렌드 데이터 — 5 min. */
export const getSharedShoppingTrends = sharedCache(
  'shopping-trends-v1',
  300,
  getShoppingTrends,
  (data) => Boolean(data?.items?.length),
)

/** 쇼핑 베스트 — 5 min. */
export const getSharedShoppingBest = sharedCache(
  'shopping-best-v1',
  300,
  getShoppingBest,
  (data) => data.platforms.some((board) => board.rising.products.length > 0 || board.popular.products.length > 0),
)

/** 마켓 시세 — 20s. */
export const getSharedMarkets = sharedCache('markets-v1', 20, getMarkets, (data) => data.items.length > 0)
