import { auth } from '@/auth'
import { AI_MODELS, claudeKey } from '@/lib/ai-models'
import { resolveGeminiKey } from '@/lib/gemini-key'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({
    models: AI_MODELS,
    geminiReady: Boolean(await resolveGeminiKey()),
    claudeReady: Boolean(claudeKey()),
  })
}
