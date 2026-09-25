import type { HotdealItem } from '@/lib/hotdeal'
import { guessHotdealCategory, tossDealEndAt } from '@/lib/hotdeal'
import { parsePartnerApis } from '@/lib/partners'
import {
  fetchTossHotdealLists,
  hasTossReadCreds,
  issueTossShareLink,
  platformTossCredentials,
  tacaIdFromProductUrl,
  tossAffiliateUrl,
  type TossProduct,
  type TossShareLinkCreds,
} from '@/lib/partners-toss'

const FRESH_MS = 8 * 60_000
const STALE_MS = 30 * 60_000
const PUBLIC_BOARD = 'https://www.hypeduck.ai/s/hypeduck-demo'
const tacaIdByItem = new Map<string, string>()

type CacheEntry = { at: number; items: HotdealItem[] }

const cache = new Map<string, CacheEntry>()
let inflight: Promise<HotdealItem[]> | null = null

function formatWon(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return ''
  return `${Math.round(value).toLocaleString('ko-KR')}원`
}

function rememberTacaId(itemId: string, tacaId: string) {
  if (itemId && tacaId) tacaIdByItem.set(String(itemId), String(tacaId))
}

export function lookupTacaId(itemId: string) {
  return tacaIdByItem.get(String(itemId)) || null
}

function toItem(
  product: TossProduct,
  kind: 'deal' | 'best',
  publisherId: string,
  goBase: string,
): HotdealItem {
  const itemId = String(product.tacaItemId)
  const tacaId = tacaIdFromProductUrl(product.productUrl)
  if (tacaId) rememberTacaId(itemId, tacaId)
  const discount = Number(product.discountRate) || null
  return {
    id: itemId,
    title: product.displayName,
    image: product.thumbnailUrl,
    url: tacaId ? tossAffiliateUrl(tacaId, publisherId) : `${goBase}/${itemId}`,
    priceText: formatWon(product.displayPrice),
    listPriceText: formatWon(product.originalPrice),
    discountRate: discount,
    timeSale: kind === 'deal',
    best: kind === 'best',
    bestRank: kind === 'best' && product.rank <= 3 ? product.rank : null,
    bigDiscount: (discount ?? 0) >= 50,
    megaDiscount: (discount ?? 0) >= 70,
    category: guessHotdealCategory(product.displayName),
    endAt: product.endAt || null,
  }
}

function mergeItems(deals: HotdealItem[], best: HotdealItem[]) {
  const seen = new Set<string>()
  const out: HotdealItem[] = []
  const push = (item: HotdealItem) => {
    const key = item.id || item.title.replace(/\s+/g, '').toLowerCase()
    if (seen.has(key)) {
      const existing = out.find((row) => row.id === key || row.id === item.id)
      if (existing) {
        existing.best = existing.best || item.best
        existing.timeSale = existing.timeSale || item.timeSale
        existing.bestRank = existing.bestRank || item.bestRank
        existing.endAt = existing.endAt || item.endAt
      }
      return
    }
    seen.add(key)
    out.push({ ...item, id: key })
  }
  deals.forEach(push)
  best.forEach(push)
  return out
}

function stripNoise(value: string) {
  return value
    .replace(/<!--.*?-->/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function parsePublicBoard(html: string, goBase: string): HotdealItem[] {
  const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((match) => ({
    index: match.index ?? 0,
    text: stripNoise(match[1]).replace(/[^\w가-힣]/g, ''),
  }))
  const cards = [...html.matchAll(/href="\/s\/hypeduck-demo\/go\/(\d+)"([\s\S]*?)<\/a>/gi)]
  const deals: HotdealItem[] = []
  const best: HotdealItem[] = []
  const boardEndAt =
    /20\d{2}-\d{2}-\d{2}T14:59:59(?:\.\d+)?Z/.exec(html)?.[0] || tossDealEndAt([])
  let bestCount = 0

  for (const match of cards) {
    const itemId = match[1]
    const block = match[2] || ''
    const index = match.index ?? 0
    const heading = [...headings].reverse().find((row) => row.index < index)?.text || ''
    const image = /<img[^>]+src="([^"]+)"/i.exec(block)?.[1] || ''
    const title =
      stripNoise(/<p[^>]*text-foreground[^>]*>([\s\S]*?)<\/p>/i.exec(block)?.[1] || '') ||
      stripNoise(/alt="([^"]+)"/i.exec(block)?.[1] || '')
    const prices = [...block.matchAll(/>([\d,]+)<!-- -->원</g)].map((row) => row[1])
    const priceText = prices[0] ? `${prices[0]}원` : ''
    const listPriceText = prices[1] ? `${prices[1]}원` : ''
    const discountRaw = />(\d+)<!-- -->%</.exec(block)?.[1]
    const discountRate = discountRaw ? Number(discountRaw) : null
    if (!itemId || !title || !image.startsWith('https://shopping.toss.im')) continue

    const item: HotdealItem = {
      id: itemId,
      title,
      image,
      url: `${goBase}/${itemId}`,
      priceText,
      listPriceText,
      discountRate,
      timeSale: heading.includes('하루특가'),
      best: heading.includes('BEST'),
      bestRank: heading.includes('BEST') ? (++bestCount <= 3 ? bestCount : null) : null,
      bigDiscount: (discountRate ?? 0) >= 50,
      megaDiscount: (discountRate ?? 0) >= 70,
      category: guessHotdealCategory(title),
      endAt: heading.includes('하루특가') ? boardEndAt : null,
    }
    if (item.timeSale) deals.push(item)
    else if (item.best) best.push(item)
    else deals.push({ ...item, timeSale: false, best: false })
  }

  return mergeItems(deals, best)
}

async function loadFromApi(creds: TossShareLinkCreds, goBase: string): Promise<HotdealItem[] | null> {
  const lists = await fetchTossHotdealLists(creds)
  if (!lists) return null
  const publisherId = creds.publisherId?.trim() || ''
  return mergeItems(
    lists.deals.map((row) => toItem(row, 'deal', publisherId, goBase)),
    lists.best.map((row) => toItem(row, 'best', publisherId, goBase)),
  )
}

async function loadPublicTossBoard(goBase: string): Promise<HotdealItem[]> {
  const res = await fetch(PUBLIC_BOARD, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html',
    },
    signal: AbortSignal.timeout(18_000),
    next: { revalidate: 300 },
  })
  if (!res.ok) return []
  const html = await res.text()
  return parsePublicBoard(html, goBase)
}

export async function loadTossHotdealItems(opts: {
  slug: string
  creds?: TossShareLinkCreds | null
}): Promise<HotdealItem[]> {
  const platform = platformTossCredentials()
  const creds: TossShareLinkCreds = {
    accessKey: opts.creds?.accessKey || platform.accessKey,
    secretKey: opts.creds?.secretKey || platform.secretKey,
    publisherId: opts.creds?.publisherId || platform.publisherId,
  }
  const cacheKey = `${opts.slug}:${creds.publisherId || 'anon'}:${hasTossReadCreds(creds) ? 'api' : 'pub'}`
  const hit = cache.get(cacheKey)
  const age = hit ? Date.now() - hit.at : Infinity
  if (hit && age < FRESH_MS) return hit.items

  if (hit && age < STALE_MS) {
    if (!inflight) {
      inflight = refresh(cacheKey, creds, opts.slug).finally(() => {
        inflight = null
      })
    }
    return hit.items
  }

  if (inflight) return inflight
  inflight = refresh(cacheKey, creds, opts.slug).finally(() => {
    inflight = null
  })
  try {
    return await inflight
  } catch {
    return hit?.items ?? []
  }
}

async function refresh(cacheKey: string, creds: TossShareLinkCreds, slug: string) {
  const goBase = `/s/${slug}/go`
  const fromApi = hasTossReadCreds(creds) ? await loadFromApi(creds, goBase) : null
  const items = fromApi?.length ? fromApi : await loadPublicTossBoard(goBase)
  if (items.length) cache.set(cacheKey, { at: Date.now(), items })
  return items
}

export async function resolveTossAffiliateUrl(
  tacaItemId: string,
  creds?: TossShareLinkCreds | null,
): Promise<string> {
  const platform = platformTossCredentials()
  const merged: TossShareLinkCreds = {
    accessKey: creds?.accessKey || platform.accessKey,
    secretKey: creds?.secretKey || platform.secretKey,
    publisherId: creds?.publisherId || platform.publisherId,
  }
  const cached = lookupTacaId(tacaItemId)
  if (cached) return tossAffiliateUrl(cached, merged.publisherId)

  const issued = await issueTossShareLink(merged, tacaItemId)
  if (issued) {
    const tacaId = tacaIdFromProductUrl(issued)
    if (tacaId) rememberTacaId(tacaItemId, tacaId)
    return issued
  }

  try {
    const res = await fetch(`${PUBLIC_BOARD}/go/${encodeURIComponent(tacaItemId)}`, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    })
    const location = res.headers.get('location') || ''
    const tacaId = tacaIdFromProductUrl(location)
    if (tacaId) {
      rememberTacaId(tacaItemId, tacaId)
      return tossAffiliateUrl(tacaId, merged.publisherId)
    }
  } catch {
    // fall through
  }

  return tossAffiliateUrl(tacaItemId, merged.publisherId)
}

export function loadTossCredsFromApis(partnerApis?: unknown): TossShareLinkCreds {
  const toss = parsePartnerApis(partnerApis).toss || {}
  const platform = platformTossCredentials()
  return {
    accessKey: toss.accessKey || platform.accessKey,
    secretKey: toss.secretKey || platform.secretKey,
    publisherId: toss.publisherId || platform.publisherId,
  }
}
