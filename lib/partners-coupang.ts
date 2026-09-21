import { createHmac } from 'crypto'

const DOMAIN = 'https://api-gateway.coupang.com'
/** Credential smoke-test via Goldbox (same approach as Coupang Partners Open API clients). */
const GOLDBOX_PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/products/goldbox'

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

type CoupangEnvelope = {
  rCode?: string
  rMessage?: string
  message?: string
  code?: string | number
}

function pickError(data: CoupangEnvelope | null, status: number): string {
  return (
    data?.rMessage ||
    data?.message ||
    (data?.code != null ? String(data.code) : '') ||
    `쿠팡 API 오류 (${status})`
  )
}

/** Smoke-test Coupang Partners credentials via Goldbox (auth only — no deeplink URL needed). */
export async function testCoupangPartners(accessKey: string, secretKey: string): Promise<{
  ok: boolean
  error?: string
}> {
  const method = 'GET'
  const path = GOLDBOX_PATH
  const authorization = hmacAuthorization(method, path, accessKey, secretKey)
  try {
    const res = await fetch(`${DOMAIN}${path}`, {
      method,
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json;charset=UTF-8',
      },
      signal: AbortSignal.timeout(12_000),
    })
    const text = await res.text()
    let data: CoupangEnvelope | null = null
    try {
      data = JSON.parse(text) as CoupangEnvelope
    } catch {
      data = null
    }
    if (!res.ok) {
      return { ok: false, error: pickError(data, res.status) }
    }
    if (data?.rCode && data.rCode !== '0') {
      return { ok: false, error: data.rMessage || `쿠팡 API: ${data.rCode}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '쿠팡 API 연결 실패' }
  }
}
