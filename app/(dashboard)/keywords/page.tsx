import { getRealtimeKeywords } from '@/lib/keywords'
import { KeywordsClient } from './keywords-client'

export const dynamic = 'force-dynamic'

export default async function KeywordsPage() {
  const data = await getRealtimeKeywords()
  return <KeywordsClient initial={data} />
}
