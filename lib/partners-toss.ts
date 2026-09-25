const TOKEN_URL = 'https://oauth2.cert.toss.im/token'
const OPENAPI = 'https://sharelink.toss.im/openapi'

export type TossShareLinkCreds = {
  accessKey?: string
  secretKey?: string
  publisherId?: string
}

export type TossProduct = {
  rank: number
  tacaItemId: number
  displayName: string
  thumbnailUrl: string
  productUrl: string
  displayPrice: number
  originalPrice: number
  discountRate: number
  isSoldOut?: boolean
  reviewScore?: number
  reviewCount?: number
  endAt?: string
  categoryIds?: number[]
}

type TokenResult = {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
  resultType?: string
  reason?: string
}

type TossEnvelope<T> = {
  resultType?: string
  success?: T
  error?: { reason?: string; message?: string }
}

type TossListSuccess = {
  items?: TossProduct[]
  nextCursor?: string | null
  hasNext?: boolean
}

let tokenCache: { key: string; token: string; exp: number } | null = null

export function platformTossCredentials(): TossShareLinkCreds {
  return {
    accessKey:
      process.env.TOSS_ACCESS_KEY?.trim() ||
      process.env.TOSS_SHARELINK_ACCESS_KEY?.trim() ||
      '',
    secretKey:
      process.env.TOSS_SECRET_KEY?.trim() ||
      process.env.TOSS_SHARELINK_SECRET_KEY?.trim() ||
      '',
    publisherId:
      process.env.TOSS_PUBLISHER_ID?.trim() ||
      process.env.TOSS_SHARELINK_PUBLISHER_ID?.trim() ||
      '',
  }
}

export function hasTossReadCreds(creds?: TossShareLinkCreds | null) {
  return Boolean(creds?.accessKey?.trim() && creds?.secretKey?.trim())
}

export function tossAffiliateUrl(tacaId: string | number, publisherId?: string | null) {
  const id = String(tacaId || '').trim()
  const url = new URL(`https://toss.shopping/t/${id}`)
  const key = String(publisherId || '').trim()
  if (key) url.searchParams.set('k', key)
  url.searchParams.set('referrer', 'affiliate')
  return url.toString()
}

export function tacaIdFromProductUrl(productUrl?: string | null) {
  const match = String(productUrl || '').match(/toss\.shopping\/t\/(\d+)/i)
  return match?.[1] || null
}

export async function getTossAccessToken(accessKey: string, secretKey: string): Promise<{
  ok: true
  token: string
} | {
  ok: false
  error: string
}> {
  const key = `${accessKey}:${secretKey}`
  if (tokenCache && tokenCache.key === key && tokenCache.exp > Date.now() + 10_000) {
    return { ok: true, token: tokenCache.token }
  }
  try {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: accessKey,
      client_secret: secretKey,
      scope: 'sharelink:read sharelink:write',
    })
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(12_000),
    })
    const data = (await res.json().catch(() => ({}))) as TokenResult
    if (!res.ok || !data.access_token) {
      const reason =
        data.error_description ||
        (typeof data.error === 'string' ? data.error : '') ||
        data.reason ||
        `토스 토큰 발급 실패 (${res.status})`
      return { ok: false, error: String(reason) }
    }
    tokenCache = {
      key,
      token: data.access_token,
      exp: Date.now() + Math.max(30, Number(data.expires_in) || 300) * 1000,
    }
    return { ok: true, token: data.access_token }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '토스 API 연결 실패' }
  }
}

/** Smoke-test Toss Share Link credentials via OAuth client_credentials. */
export async function testTossShareLink(accessKey: string, secretKey: string): Promise<{
  ok: boolean
  error?: string
}> {
  const token = await getTossAccessToken(accessKey, secretKey)
  return token.ok ? { ok: true } : { ok: false, error: token.error }
}

async function tossOpenGet<T>(token: string, path: string): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${OPENAPI}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(12_000),
    })
    const json = (await res.json().catch(() => ({}))) as TossEnvelope<T>
    if (!res.ok || json.resultType !== 'SUCCESS' || !json.success) {
      const reason =
        json.error?.message ||
        json.error?.reason ||
        `토스 Open API 실패 (${res.status})`
      return { ok: false, error: String(reason) }
    }
    return { ok: true, data: json.success }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '토스 Open API 연결 실패' }
  }
}

async function tossOpenPost<T>(
  token: string,
  path: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${OPENAPI}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    })
    const json = (await res.json().catch(() => ({}))) as TossEnvelope<T>
    if (!res.ok || json.resultType !== 'SUCCESS' || !json.success) {
      const reason =
        json.error?.message ||
        json.error?.reason ||
        `토스 Open API 실패 (${res.status})`
      return { ok: false, error: String(reason) }
    }
    return { ok: true, data: json.success }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '토스 Open API 연결 실패' }
  }
}

async function fetchTossList(
  token: string,
  path: string,
  size: number,
  pages: number,
): Promise<TossProduct[]> {
  const items: TossProduct[] = []
  let cursor: string | null = null
  for (let page = 0; page < pages; page++) {
    const query = new URLSearchParams({ size: String(size) })
    if (cursor) query.set('cursor', cursor)
    const res = await tossOpenGet<TossListSuccess>(token, `${path}?${query.toString()}`)
    if (!res.ok) break
    const rows = Array.isArray(res.data.items) ? res.data.items : []
    items.push(...rows.filter((row) => row && row.tacaItemId && !row.isSoldOut))
    if (!res.data.hasNext || !res.data.nextCursor) break
    cursor = res.data.nextCursor
  }
  return items
}

export async function fetchTossHotdealLists(creds: TossShareLinkCreds): Promise<{
  deals: TossProduct[]
  best: TossProduct[]
} | null> {
  if (!hasTossReadCreds(creds)) return null
  const token = await getTossAccessToken(String(creds.accessKey), String(creds.secretKey))
  if (!token.ok) return null
  const [deals, best] = await Promise.all([
    fetchTossList(token.token, '/products/today-deals', 30, 3),
    fetchTossList(token.token, '/products/best', 30, 3),
  ])
  if (!deals.length && !best.length) return null
  return { deals, best }
}

export async function issueTossShareLink(
  creds: TossShareLinkCreds,
  tacaItemId: string | number,
): Promise<string | null> {
  if (!hasTossReadCreds(creds) || !creds.publisherId?.trim()) return null
  const token = await getTossAccessToken(String(creds.accessKey), String(creds.secretKey))
  if (!token.ok) return null
  const res = await tossOpenPost<{ originUrl?: string; shortUrl?: string }>(token.token, '/links', {
    tacaItemId: Number(tacaItemId),
    publisherId: creds.publisherId.trim(),
  })
  if (!res.ok) return null
  return res.data.originUrl || res.data.shortUrl || null
}
