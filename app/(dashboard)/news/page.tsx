import { getRealtimeKeywords } from '@/lib/keywords'
import { NewsClient } from './news-client'

export const dynamic = 'force-dynamic'

export default async function NewsPage() {
  const data = await getRealtimeKeywords()
  return <NewsClient initial={data} />
}
