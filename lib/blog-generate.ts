import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { claudeKey, geminiKey } from './ai-keys'
import { AiError, availableModels } from './ai-generate'
import { DEFAULT_AI_MODEL, findAiModel } from './ai-models'
import { buildBlogUserPrompt } from './blog-prompts'
import {
  appendProductBlock,
  collectCandidateImages,
  fillUnsplashIfNeeded,
  markdownToSimpleHtml,
  replaceImagePlaceholders,
} from './blog-media'
import type { BlogMode, BlogImage, BlogProductSnapshot } from './blog-types'

const TIMEOUT_MS = 90_000
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'

export type BlogGenerateResult = {
  title: string
  bodyMarkdown: string
  bodyHtml: string
  tags: string[]
  images: BlogImage[]
  model: string
}

function parseArticle(text: string, fallbackTitle: string) {
  const raw = text.replace(/```json|```/g, '').trim()
  const tryParse = (s: string) => {
    const parsed = JSON.parse(s) as { title?: string; body?: string; tags?: string[] }
    return {
      title: String(parsed.title || fallbackTitle).trim(),
      body: String(parsed.body || '').trim(),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 8) : [],
    }
  }
  try {
    return tryParse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return tryParse(match[0])
      } catch {
        /* fallthrough */
      }
    }
  }
  return { title: fallbackTitle, body: raw, tags: [] as string[] }
}

async function viaClaude(prompt: string, modelId: string) {
  const apiKey = claudeKey()
  if (!apiKey) throw new AiError('Claude 키가 없습니다.')
  const anthropic = new Anthropic({ apiKey, timeout: TIMEOUT_MS })
  const message = await anthropic.messages.create({
    model: modelId,
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })
  const content = message.content[0]
  if (!content || content.type !== 'text') throw new AiError('Claude가 빈 응답을 보냈습니다.')
  return content.text
}

async function viaGemini(prompt: string, modelId: string) {
  const apiKey = geminiKey()
  if (!apiKey) throw new AiError('Gemini 키가 없습니다.')
  const res = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model: modelId,
      input: prompt,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            body: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['title', 'body'],
        },
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  })
  if (!res.ok) {
    const raw = await res.text().catch(() => '')
    throw new AiError(`Gemini 오류 ${res.status}: ${raw.slice(0, 200)}`)
  }
  const payload = await res.json()
  const steps = (payload as { steps?: unknown })?.steps
  const chunks: string[] = []
  if (Array.isArray(steps)) {
    for (const step of steps) {
      const entry = step as { type?: string; content?: unknown }
      if (entry?.type !== 'model_output' || !Array.isArray(entry.content)) continue
      for (const item of entry.content) {
        const part = item as { type?: string; text?: unknown }
        if (part?.type === 'text' && typeof part.text === 'string') chunks.push(part.text)
      }
    }
  }
  const text = chunks.join('').trim()
  if (!text) throw new AiError('Gemini가 빈 응답을 보냈습니다.')
  return text
}

export async function generateBlogArticle(input: {
  mode: BlogMode
  keyword: string
  relatedNews?: Array<{ title: string; url: string; image?: string }>
  product?: BlogProductSnapshot | null
  modelId?: string | null
}): Promise<BlogGenerateResult> {
  let images = collectCandidateImages({
    relatedNews: input.relatedNews,
    product: input.product,
  })
  images = await fillUnsplashIfNeeded(input.keyword, images, 2)

  const newsDigest = (input.relatedNews ?? [])
    .slice(0, 6)
    .map((n, i) => `${i + 1}. ${n.title}${n.url ? ` (${n.url})` : ''}`)
    .join('\n')

  const prompt = buildBlogUserPrompt({
    mode: input.mode,
    keyword: input.keyword,
    newsDigest,
    product: input.product,
    imageCount: images.length,
  })

  const models = availableModels()
  const model = findAiModel(input.modelId) || models[0] || DEFAULT_AI_MODEL
  const raw =
    model.provider === 'gemini'
      ? await viaGemini(prompt, model.id)
      : await viaClaude(prompt, model.id)

  const parsed = parseArticle(raw, input.keyword)
  let bodyMarkdown = replaceImagePlaceholders(parsed.body, images)
  if (input.product?.url && !bodyMarkdown.includes(input.product.url)) {
    bodyMarkdown += `\n\n## 관련 상품\n- [${input.product.title}](${input.product.url})\n`
  }
  let bodyHtml = markdownToSimpleHtml(bodyMarkdown)
  bodyHtml = appendProductBlock(bodyHtml, input.product)

  return {
    title: parsed.title,
    bodyMarkdown,
    bodyHtml,
    tags: parsed.tags,
    images,
    model: model.id,
  }
}
