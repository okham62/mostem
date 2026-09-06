import { auth } from '@/auth'
import { AI_MODELS, claudeKey, geminiKey } from '@/lib/ai-models'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({
    models: AI_MODELS,
    geminiReady: Boolean(geminiKey()),
    claudeReady: Boolean(claudeKey()),
  })
}
