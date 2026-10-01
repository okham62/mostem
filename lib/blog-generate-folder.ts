import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { claudeKey, geminiKey } from './ai-keys'
import { AiError, availableModels } from './ai-generate'
import { DEFAULT_AI_MODEL, findAiModel } from './ai-models'
import { markdownToSimpleHtml, replaceImagePlaceholders } from './blog-media'
import { blogSystemPrompt } from './blog-prompts'
import type { BlogGenerateResult } from './blog-generate'
import type { BlogImage, BlogMode } from './blog-types'

const TIMEOUT_MS = 120_000

export type FolderImageInput = {
  filename: string
  mimeType: string
  base64: string
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

async function describeImageClaude(image: FolderImageInput, index: number) {
  const apiKey = claudeKey()
  if (!apiKey) throw new AiError('Claude 키가 없습니다.')
  const anthropic = new Anthropic({ apiKey, timeout: TIMEOUT_MS })
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: (image.mimeType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: image.base64,
            },
          },
          {
            type: 'text',
            text: `이미지 ${index + 1} (${image.filename})의 내용을 한국어로 자세히 설명하세요.
제품/장면/색/텍스트/분위기/쓰임새를 포함하세요. 3~6문장. 설명문만 출력.`,
          },
        ],
      },
    ],
  })
  const content = message.content[0]
  if (!content || content.type !== 'text') throw new AiError('이미지 인식 실패')
  return content.text.trim()
}

async function describeImageGemini(image: FolderImageInput, index: number) {
  const apiKey = geminiKey()
  if (!apiKey) throw new AiError('Gemini 키가 없습니다.')
  const model = 'gemini-2.0-flash'
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: image.mimeType || 'image/jpeg',
                  data: image.base64,
                },
              },
              {
                text: `이미지 ${index + 1} (${image.filename})의 내용을 한국어로 자세히 설명하세요. 3~6문장. 설명문만.`,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    }
  )
  if (!res.ok) {
    const raw = await res.text().catch(() => '')
    throw new AiError(`Gemini 비전 오류 ${res.status}: ${raw.slice(0, 200)}`)
  }
  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('')?.trim()
  if (!text) throw new AiError('Gemini 비전 빈 응답')
  return text
}

function hashtagLine(tags: string[]) {
  return tags
    .map((tag) => {
      const clean = tag.replace(/^#+/, '').replace(/\s+/g, '')
      return clean ? `#${clean}` : ''
    })
    .filter(Boolean)
    .join(' ')
}

function ensureHashtagEnding(body: string, tags: string[]) {
  const line = hashtagLine(tags)
  if (!line) return body.trim()
  const tail = body.trim().split('\n').slice(-4).join('\n')
  if (/#[^\s#]{2,}/.test(tail)) return body.trim()
  return `${body.trim()}\n\n${line}`
}

async function writeFromDescriptions(input: {
  mode: BlogMode
  topic: string
  descriptions: string[]
  modelId?: string | null
  fixedTitle?: string | null
}) {
  const models = availableModels()
  const model = findAiModel(input.modelId) || models[0] || DEFAULT_AI_MODEL
  const digest = input.descriptions.map((d, i) => `### 이미지 ${i + 1}\n${d}`).join('\n\n')
  const placeholders = input.descriptions
    .map((_, i) => `[IMAGE_${i + 1}]`)
    .join(', ')

  const shopping = input.mode === 'product'
  const titleRule = input.fixedTitle
    ? `- title 필드는 반드시 이 문장 그대로: ${input.fixedTitle}`
    : '- title은 상품이 드러나는 짧은 한국어 제목'
  const prompt = `${blogSystemPrompt(input.mode === 'folder' ? 'seo' : input.mode)}

주제/폴더: ${input.topic}
아래는 폴더 이미지를 파일 이름 순서대로 인식한 결과입니다. 각 이미지 단락 위나 아래에 [IMAGE_n] 플레이스홀더를 넣으세요.
이미지 개수: ${input.descriptions.length}
플레이스홀더: ${placeholders}

인식 결과:
${digest}

작성 규칙:
- 한국어
- 이미지 순서대로 1→N 모두 다루기
${titleRule}
${
  shopping
    ? `- 각 이미지는 그 상품에 맞는 판매 멘트를 2~4문장으로 간략히. 과장된 장문 금지.
- tags는 블로그 검색에 쓸 해시태그 단어 8~12개. # 없이 단어만.
- body 마지막 줄은 그 태그를 #단어 형태로 한 줄에 모은 해시태그.`
    : `- Markdown (본문에 # 제목 금지, ## / ### 사용)
- 태그 5개 이내`
}

JSON만 반환:
{"title":"제목","body":"마크다운 본문","tags":["태그1"]}`

  const apiKey = claudeKey()
  if (model.provider === 'claude' && apiKey) {
    const anthropic = new Anthropic({ apiKey, timeout: TIMEOUT_MS })
    const message = await anthropic.messages.create({
      model: model.id,
      max_tokens: 5000,
      messages: [{ role: 'user', content: prompt }],
    })
    const content = message.content[0]
    if (!content || content.type !== 'text') throw new AiError('Claude 빈 응답')
    return { raw: content.text, modelId: model.id }
  }

  const gKey = geminiKey()
  if (!gKey) throw new AiError('AI 키가 없습니다.')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${gKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    }
  )
  if (!res.ok) throw new AiError(`Gemini 오류 ${res.status}`)
  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('')?.trim()
  if (!text) throw new AiError('Gemini 빈 응답')
  return { raw: text, modelId: model.id }
}

/**
 * Recognize each image, then write one article with a section per image.
 * `imageUrls` should be stable public/data URLs already stored for placeholders.
 */
export async function generateFolderArticle(input: {
  topic: string
  mode?: BlogMode
  images: FolderImageInput[]
  imageUrls: string[]
  modelId?: string | null
  fixedTitle?: string | null
}): Promise<BlogGenerateResult & { descriptions: string[] }> {
  if (!input.images.length) throw new AiError('이미지가 없습니다.')
  if (input.images.length > 20) throw new AiError('이미지는 최대 20장입니다.')

  const useClaude = Boolean(claudeKey())
  const descriptions: string[] = []
  for (let i = 0; i < input.images.length; i++) {
    const desc = useClaude
      ? await describeImageClaude(input.images[i], i)
      : await describeImageGemini(input.images[i], i)
    descriptions.push(desc)
  }

  const { raw, modelId } = await writeFromDescriptions({
    mode: input.mode || 'folder',
    topic: input.topic,
    descriptions,
    modelId: input.modelId,
    fixedTitle: input.fixedTitle,
  })

  const blogImages: BlogImage[] = input.imageUrls.map((url, index) => ({
    index: index + 1,
    url,
    alt: descriptions[index]?.slice(0, 80) || `이미지 ${index + 1}`,
    source: 'folder',
    filename: input.images[index]?.filename,
  }))

  const parsed = parseArticle(raw, input.fixedTitle || input.topic)
  const title = input.fixedTitle?.trim() || parsed.title
  const tags = parsed.tags.length ? parsed.tags : []
  const bodyMarkdown = ensureHashtagEnding(replaceImagePlaceholders(parsed.body, blogImages), tags)
  const bodyHtml = markdownToSimpleHtml(bodyMarkdown)

  return {
    title,
    bodyMarkdown,
    bodyHtml,
    tags: parsed.tags,
    images: blogImages,
    model: modelId,
    descriptions,
  }
}
