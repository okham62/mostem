import { getRealtimeKeywords } from '@/lib/keywords'
import { KeywordsClient } from './keywords-client'

export const dynamic = 'force-dynamic'

export default async function KeywordsPage() {
  const initial = await getRealtimeKeywords('fast').catch(() => null)
  return <KeywordsClient initial={initial} />
}
