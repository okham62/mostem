import { createAdminClient } from '@/lib/supabase/admin'

const SECRET_NAME = '__gemini_key__'

function fromEnv() {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || ''
  return key && !key.includes('your_') ? key : ''
}

export async function resolveGeminiKey() {
  const env = fromEnv()
  if (env) return env
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('templates')
      .select('description_format')
      .eq('name', SECRET_NAME)
      .maybeSingle()
    const value = String(data?.description_format ?? '').trim()
    return value && !value.includes('your_') ? value : ''
  } catch {
    return ''
  }
}

export async function saveGeminiKey(value: string, userId: string) {
  const key = value.trim()
  if (!key) throw new Error('API 키가 없습니다.')
  const supabase = createAdminClient()
  const { data: existing } = await supabase.from('templates').select('id').eq('name', SECRET_NAME).maybeSingle()
  if (existing?.id) {
    const { error } = await supabase
      .from('templates')
      .update({ description_format: key })
      .eq('id', existing.id)
    if (error) throw new Error(error.message)
    return
  }
  const { error } = await supabase.from('templates').insert({
    user_id: userId,
    name: SECRET_NAME,
    description_format: key,
    default_tags: ['secret_gemini'],
  })
  if (error) throw new Error(error.message)
}
