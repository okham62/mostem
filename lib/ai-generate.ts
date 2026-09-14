import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { claudeKey, geminiKey, scrubSecrets } from './ai-keys'
import { AI_MODELS, findAiModel, parseDrafts, type AiModelOption, type AiProvider } from './ai-models'
import type { GeminiMediaPart } from './ai-media'

const TIMEOUT_MS = 60_000
const TIMEOUT_MEDIA_MS = 90_000
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'

/** Errors safe to show to a signed-in operator: never built from raw provider payloads. */
export class AiError extends Error {}

export function readyProviders(): Record<AiProvider, boolean> {
  return {
    claude: Boolean(claudeKey()),
    gemini: Boolean(geminiKey()),
  }
}

export function availableModels() {
  const ready = readyProviders()
  return AI_MODELS.filter((model) => ready[model.provider])
}

export async function generateDrafts({
  prompt,
  fallback,
  modelId,
  media,
}: {
  prompt: string
  fallback: string
  modelId?: string | null
  media?: GeminiMediaPart[]
}) {
  const model = findAiModel(modelId)
  const drafts =
    model.provider === 'gemini'
      ? await viaGemini(model, prompt, fallback, media)
      : await viaClaude(model, prompt, fallback)
  return { drafts, model: model.id }
}

async function viaClaude(model: AiModelOption, prompt: string, fallback: string) {
  const apiKey = claudeKey()
  if (!apiKey) throw new AiError('Claude 키가 없습니다. 서버 환경변수 ANTHROPIC_API_KEY를 설정해 주세요.')

  const anthropic = new Anthropic({ apiKey, timeout: TIMEOUT_MS })
  const message = await anthropic.messages.create({
    model: model.id,
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })
  const content = message.content[0]
  if (!content || content.type !== 'text') throw new AiError('Claude가 빈 응답을 보냈습니다.')
  return parseDrafts(content.text, fallback)
}

async function viaGemini(
  model: AiModelOption,
  prompt: string,
  fallback: string,
  media: GeminiMediaPart[] = []
) {
  const apiKey = geminiKey()
  if (!apiKey) throw new AiError('Gemini 키가 없습니다. 서버 환경변수 GEMINI_API_KEY를 설정해 주세요.')

  const input =
    media.length > 0
      ? ([{ type: 'text', text: prompt }, ...media] as Array<Record<string, string>>)
      : prompt

  const res = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    // Header auth keeps the key out of URLs, redirects and proxy access logs.
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model: model.id,
      input,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: {
          type: 'object',
          properties: { drafts: { type: 'array', items: { type: 'string' } } },
          required: ['drafts'],
        },
      },
    }),
    signal: AbortSignal.timeout(media.length ? TIMEOUT_MEDIA_MS : TIMEOUT_MS),
    cache: 'no-store',
  })

  if (!res.ok) {
    const raw = await res.text().catch(() => '')
    throw new AiError(`Gemini 오류 ${res.status}: ${geminiErrorMessage(raw)}`)
  }

  const text = geminiText(await res.json())
  if (!text) throw new AiError('Gemini가 빈 응답을 보냈습니다.')
  return parseDrafts(text, fallback)
}

/** Interactions API returns a steps timeline; the answer lives in model_output text blocks. */
function geminiText(payload: unknown) {
  const steps = (payload as { steps?: unknown })?.steps
  if (!Array.isArray(steps)) return ''
  const chunks: string[] = []
  for (const step of steps) {
    const entry = step as { type?: string; content?: unknown }
    if (entry?.type !== 'model_output' || !Array.isArray(entry.content)) continue
    for (const item of entry.content) {
      const part = item as { type?: string; text?: unknown }
      if (part?.type === 'text' && typeof part.text === 'string') chunks.push(part.text)
    }
  }
  return chunks.join('').trim()
}

function geminiErrorMessage(raw: string) {
  let message = raw
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string; status?: string } }
    message = parsed.error?.message || parsed.error?.status || raw
  } catch {
    /* fall through to the raw body */
  }
  return scrubSecrets(message).slice(0, 200) || '자세한 사유가 없습니다.'
}
