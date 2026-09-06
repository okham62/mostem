import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_AI_GUIDES, type AiGuide } from '@/lib/ai-guides'

const GUIDE_TAG = 'ai_guide'
const DEFAULT_TAG = 'ai_guide_default'

type TemplateRow = {
  id: string
  name: string
  description_format: string | null
  default_tags: string[] | null
}

function fromRow(row: TemplateRow): AiGuide {
  const tags = row.default_tags ?? []
  return {
    id: row.id,
    name: row.name,
    content: row.description_format ?? '',
    isDefault: tags.includes(DEFAULT_TAG),
  }
}

function tagsFor(isDefault: boolean) {
  return isDefault ? [GUIDE_TAG, DEFAULT_TAG] : [GUIDE_TAG]
}

async function readStoredGuides(): Promise<AiGuide[] | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('templates')
    .select('id, name, description_format, default_tags')
    .order('created_at', { ascending: true })
  if (error) return null
  const guides = (data as TemplateRow[])
    .filter((row) => row.name !== '__gemini_key__' && (row.default_tags ?? []).includes(GUIDE_TAG))
    .map(fromRow)
  if (guides.length && !guides.some((item) => item.isDefault)) guides[0].isDefault = true
  return guides
}

export async function listAiGuides(): Promise<AiGuide[]> {
  const stored = await readStoredGuides()
  if (!stored?.length) return DEFAULT_AI_GUIDES
  return stored
}

export async function seedAiGuides(userId: string) {
  const stored = await readStoredGuides()
  if (stored === null) return DEFAULT_AI_GUIDES
  if (stored.length) return stored

  const supabase = createAdminClient()
  const rows = DEFAULT_AI_GUIDES.map((item) => ({
    user_id: userId,
    name: item.name,
    description_format: item.content,
    default_tags: tagsFor(item.isDefault),
  }))
  const { data, error } = await supabase
    .from('templates')
    .insert(rows)
    .select('id, name, description_format, default_tags')
  if (error || !data?.length) return DEFAULT_AI_GUIDES
  return (data as TemplateRow[]).map(fromRow)
}

export async function createAiGuide(userId: string, name: string, content: string) {
  const supabase = createAdminClient()
  const existing = await listAiGuides()
  const makeDefault = existing.every((item) => item.builtin)
  const { data, error } = await supabase
    .from('templates')
    .insert({
      user_id: userId,
      name,
      description_format: content,
      default_tags: tagsFor(makeDefault),
    })
    .select('id, name, description_format, default_tags')
    .single()
  if (error || !data) throw new Error(error?.message || '지침서를 저장하지 못했습니다.')
  return fromRow(data as TemplateRow)
}

export async function updateAiGuide(id: string, patch: { name?: string; content?: string; isDefault?: boolean }) {
  const supabase = createAdminClient()
  if (patch.isDefault) {
    const all = await listAiGuides()
    for (const guide of all) {
      if (guide.builtin) continue
      await supabase
        .from('templates')
        .update({ default_tags: tagsFor(guide.id === id) })
        .eq('id', guide.id)
    }
  }
  const next: Record<string, unknown> = {}
  if (patch.name != null) next.name = patch.name
  if (patch.content != null) next.description_format = patch.content
  if (patch.isDefault) next.default_tags = tagsFor(true)
  if (Object.keys(next).length) {
    const { error } = await supabase.from('templates').update(next).eq('id', id)
    if (error) throw new Error(error.message)
  }
  return listAiGuides()
}

export async function deleteAiGuide(id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('templates').delete().eq('id', id)
  if (error) throw new Error(error.message)
  const left = await listAiGuides()
  if (left.length && !left.some((item) => item.isDefault) && !left[0].builtin) {
    await supabase.from('templates').update({ default_tags: tagsFor(true) }).eq('id', left[0].id)
  }
  return listAiGuides()
}
