const TOKEN_URL = 'https://oauth2.cert.toss.im/token'

/** Smoke-test Toss Share Link credentials via OAuth client_credentials. */
export async function testTossShareLink(accessKey: string, secretKey: string): Promise<{
  ok: boolean
  error?: string
}> {
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
    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string
      error?: string
      error_description?: string
      resultType?: string
      reason?: string
    }
    if (!res.ok || !data.access_token) {
      const reason =
        data.error_description ||
        (typeof data.error === 'string' ? data.error : '') ||
        data.reason ||
        `토스 토큰 발급 실패 (${res.status})`
      return { ok: false, error: String(reason) }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '토스 API 연결 실패' }
  }
}
