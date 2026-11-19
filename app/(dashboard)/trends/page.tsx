import { getShoppingTrends } from '@/lib/trends'
import { getSharedShoppingTrends } from '@/lib/shared-data'
import { TrendsClient } from './trends-client'

export const dynamic = 'force-dynamic'

export default async function TrendsPage() {
  // Shared warm copy answers instantly instead of waiting for the trend site on every click.
  const data = await getSharedShoppingTrends(1, {}).catch(() => getShoppingTrends())
  return <TrendsClient initial={data} />
}
