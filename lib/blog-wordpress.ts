import 'server-only'
import type { BlogAccountRow } from './blog-types'

export async function publishToWordPress(input: {
  account: BlogAccountRow
  title: string
  html: string
  status?: 'draft' | 'publish'
  tags?: string[]
}) {
  const base = input.account.site_url.replace(/\/+$/, '')
  const endpoint = `${base}/wp-json/wp/v2/posts`
  const auth = Buffer.from(`${input.account.username}:${input.account.app_password}`).toString(
    'base64'
  )

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      title: input.title,
      content: input.html,
      status: input.status ?? 'draft',
      // tags as names require term endpoints; keep categories empty for MVP
    }),
    signal: AbortSignal.timeout(30_000),
  })

  const data = (await res.json().catch(() => null)) as
    | { id?: number; link?: string; message?: string; code?: string }
    | null

  if (!res.ok) {
    throw new Error(data?.message || `WordPress 발행 실패 (${res.status})`)
  }

  return {
    id: data?.id ?? null,
    url: data?.link ?? `${base}/?p=${data?.id ?? ''}`,
  }
}

export async function testWordPressAccount(account: Pick<BlogAccountRow, 'site_url' | 'username' | 'app_password'>) {
  const base = account.site_url.replace(/\/+$/, '')
  const auth = Buffer.from(`${account.username}:${account.app_password}`).toString('base64')
  const res = await fetch(`${base}/wp-json/wp/v2/users/me`, {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(data?.message || `WordPress 연결 실패 (${res.status})`)
  }
  return true
}
