import { getShoppingTrends } from '@/lib/trends'
import { TrendsClient } from './trends-client'

export const dynamic = 'force-dynamic'

export default async function TrendsPage() {
  const data = await getShoppingTrends(1, {}, { fast: true })
  return <TrendsClient initial={data} />
}
