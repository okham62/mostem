import { getShoppingTrends } from '@/lib/trends'
import type { TrendsPayload } from '@/lib/trends'
import { TrendsClient } from './trends-client'

export default async function TrendsPage() {
  const initial = await Promise.race([
    getShoppingTrends(1, {}, { fast: true }).catch(() => null),
    new Promise<TrendsPayload | null>((resolve) => setTimeout(() => resolve(null), 700)),
  ])
  return <TrendsClient initial={initial} />
}
