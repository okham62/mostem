import { auth } from '@/auth'
import { availableModels, readyProviders } from '@/lib/ai-generate'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ready = readyProviders()
  // Only readiness booleans leave the server: never the keys themselves.
  return NextResponse.json(
    {
      models: availableModels(),
      claudeReady: ready.claude,
      geminiReady: ready.gemini,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
