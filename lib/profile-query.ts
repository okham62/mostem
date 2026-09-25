import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeLinkSettings, type LinkSettings } from '@/lib/links'

export const getProfileBySlug = cache(async (slug: string): Promise<LinkSettings | null> => {
  const supabase = createAdminClient()
  const { data } = await supabase.from('link_settings').select('*').eq('profile_slug', slug).maybeSingle()
  if (!data) return null
  return normalizeLinkSettings(data as Record<string, unknown>)
})
