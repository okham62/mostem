import { createHmac } from 'crypto'

const DOMAIN = 'https://api-gateway.coupang.com'
const GOLDBOX_PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/products/goldbox'
const DEEPLINK_PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink'
const SEARCH_PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/products/search'
const COMMISSION_PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/reports/commission'

function signedDateUtc(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${String(d.getUTCFullYear()).slice(2)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

function hmacAuthorization(method: string, pathWithQuery: string, accessKey: string, secretKey: string) {
  const [path, query = ''] = pathWithQuery.split('?')
  const signedDate = signedDateUtc()
  const message = `${signedDate}${method}${path}${query}`
  const signature = createHmac('sha256', secretKey).update(message).digest('hex')
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${signedDate}, signature=${signature}`
}

type CoupangEnvelope<T = unknown> = {
  rCode?: string
  rMessage?: string
  message?: string
  code?: string | number
  data?: T
}

function pickError(data: CoupangEnvelope | null, status: number): string {
  return (
    data?.rMessage ||
    data?.message ||
    (data?.code != null ? String(data.code) : '') ||
    `쿠팡 API 오류 (${status})`
  )
}

async function coupangRequest<T>(
  method: 'GET' | 'POST',
  pathWithQuery: string,
  accessKey: string,
  secretKey: string,
  body?: unknown
): Promise<{ ok: true; data: T | null } | { ok: false; error: string }> {
  const authorization = hmacAuthorization(method, pathWithQuery, accessKey, secretKey)
  try {
    const res = await fetch(`${DOMAIN}${pathWithQuery}`, {
      method,
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json;charset=UTF-8',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    })
    const text = await res.text()
    let parsed: CoupangEnvelope<T> | null = null
    try {
      parsed = JSON.parse(text) as CoupangEnvelope<T>
    } catch {
      parsed = null
    }
    if (!res.ok) return { ok: false, error: pickError(parsed, res.status) }
    if (parsed?.rCode && parsed.rCode !== '0') {
      return { ok: false, error: parsed.rMessage || `쿠팡 API: ${parsed.rCode}` }
    }
    return { ok: true, data: (parsed?.data ?? null) as T | null }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '쿠팡 API 연결 실패' }
  }
}

/** Coupang subId — channel label used for deeplink + report matching. */
export function toCoupangSubId(channel: string): string {
  const raw = String(channel || '').trim() || 'default'
  // Partners console / reports accept Hangul; keep readable, cap length.
  return raw.slice(0, 50)
}

/** Smoke-test Coupang Partners credentials via Goldbox. */
export async function testCoupangPartners(accessKey: string, secretKey: string): Promise<{
  ok: boolean
  error?: string
}> {
  const res = await coupangRequest<unknown>('GET', GOLDBOX_PATH, accessKey, secretKey)
  return res.ok ? { ok: true } : { ok: false, error: res.error }
}

export async function createCoupangDeeplink(
  accessKey: string,
  secretKey: string,
  coupangUrl: string,
  subId: string
): Promise<{ ok: true; shortenUrl: string; landingUrl: string } | { ok: false; error: string }> {
  const res = await coupangRequest<
    Array<{ originalUrl?: string; shortenUrl?: string; landingUrl?: string }>
  >('POST', DEEPLINK_PATH, accessKey, secretKey, {
    coupangUrls: [coupangUrl],
    subId: toCoupangSubId(subId),
  })
  if (!res.ok) return res
  const row = Array.isArray(res.data) ? res.data[0] : null
  const shortenUrl = String(row?.shortenUrl || '').trim()
  const landingUrl = String(row?.landingUrl || '').trim()
  if (!shortenUrl && !landingUrl) {
    return { ok: false, error: '쿠팡 딥링크 변환 결과가 비어 있습니다' }
  }
  return { ok: true, shortenUrl: shortenUrl || landingUrl, landingUrl: landingUrl || shortenUrl }
}

export type CoupangSearchProduct = {
  rank: number
  productId: string
  title: string
  image: string
  price: number | null
  priceText: string
  url: string
  affiliateUrl: string
  isRocket?: boolean
}

type CoupangSearchPayload = {
  landingUrl?: string
  productData?: Array<{
    rank?: number
    productId?: number | string
    productName?: string
    productImage?: string
    productPrice?: number
    productUrl?: string
    isRocket?: boolean
  }>
}

export async function searchCoupangProducts(
  accessKey: string,
  secretKey: string,
  keyword: string,
  subId: string
): Promise<
  | { ok: true; products: CoupangSearchProduct[]; landingUrl: string }
  | { ok: false; error: string }
> {
  const qs = [
    `keyword=${encodeURIComponent(keyword.trim())}`,
    'limit=10',
    `subId=${encodeURIComponent(toCoupangSubId(subId))}`,
    'imageSize=512x512',
    'srpLinkOnly=false',
  ].join('&')
  const res = await coupangRequest<CoupangSearchPayload>('GET', `${SEARCH_PATH}?${qs}`, accessKey, secretKey)
  if (!res.ok) return res
  const rows = Array.isArray(res.data?.productData) ? res.data.productData : []
  const products: CoupangSearchProduct[] = []
  for (const row of rows) {
    const title = String(row.productName || '').trim()
    const affiliateUrl = String(row.productUrl || '').trim()
    const productId = String(row.productId || '').trim()
    if (!title || !affiliateUrl) continue
    const price = typeof row.productPrice === 'number' ? row.productPrice : null
    products.push({
      rank: Number(row.rank) || products.length + 1,
      productId,
      title,
      image: String(row.productImage || '').trim(),
      price,
      priceText: price != null ? `${price.toLocaleString('ko-KR')}원` : '',
      url: productId
        ? `https://www.coupang.com/vp/products/${productId}`
        : affiliateUrl,
      affiliateUrl,
      isRocket: Boolean(row.isRocket),
    })
  }
  return {
    ok: true,
    products,
    landingUrl: String(res.data?.landingUrl || '').trim(),
  }
}

export type CoupangCommissionRow = {
  date?: string | number
  trackingCode?: string
  subId?: string
  commission?: number
  click?: number
  order?: number
  cancel?: number
  gmv?: number
}

export type CoupangChannelAgg = {
  subId: string
  clicks: number
  orders: number
  revenue: number
}

/** yyyyMMdd in Asia/Seoul. */
export function formatYmdKst(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const m = parts.find((p) => p.type === 'month')?.value ?? '01'
  const d = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${y}${m}${d}`
}

export function lastNDaysRangeKst(days: number): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date(end.getTime() - Math.max(0, days - 1) * 24 * 60 * 60 * 1000)
  return { startDate: formatYmdKst(start), endDate: formatYmdKst(end) }
}

export async function fetchCoupangCommissionReport(
  accessKey: string,
  secretKey: string,
  startDate: string,
  endDate: string
): Promise<{ ok: true; rows: CoupangCommissionRow[] } | { ok: false; error: string }> {
  const all: CoupangCommissionRow[] = []
  for (let page = 0; page < 30; page++) {
    const qs = new URLSearchParams({
      startDate,
      endDate,
      page: String(page),
    })
    const pathWithQuery = `${COMMISSION_PATH}?${qs.toString()}`
    const res = await coupangRequest<CoupangCommissionRow[]>(
      'GET',
      pathWithQuery,
      accessKey,
      secretKey
    )
    if (!res.ok) return res
    const chunk = Array.isArray(res.data) ? res.data : []
    all.push(...chunk)
    if (chunk.length < 1000) break
  }
  return { ok: true, rows: all }
}

export function aggregateCommissionBySubId(rows: CoupangCommissionRow[]): Map<string, CoupangChannelAgg> {
  const map = new Map<string, CoupangChannelAgg>()
  for (const row of rows) {
    const subId = String(row.subId || '').trim() || '(미지정)'
    const cur = map.get(subId) || { subId, clicks: 0, orders: 0, revenue: 0 }
    cur.clicks += Number(row.click) || 0
    cur.orders += Number(row.order) || 0
    cur.revenue += Number(row.commission) || 0
    map.set(subId, cur)
  }
  return map
}
