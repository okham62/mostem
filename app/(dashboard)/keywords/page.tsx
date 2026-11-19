import { getRealtimeKeywords } from '@/lib/keywords'
import { getSharedRealtimeKeywords } from '@/lib/shared-data'
import { KeywordsClient } from './keywords-client'

export const dynamic = 'force-dynamic'

export default async function KeywordsPage() {
  // Shared warm copy (Naver + Google) answers instantly; only a cold start falls back to the fast path.
  const initial = await getSharedRealtimeKeywords().catch(() => getRealtimeKeywords('fast').catch(() => null))
  return <KeywordsClient initial={initial} />
}
