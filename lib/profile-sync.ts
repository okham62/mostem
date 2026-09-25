import { createAdminClient } from '@/lib/supabase/admin'
import {
  missingProfileBlocksFromLinks,
  normalizeLinkSettings,
  slimProfileBlocks,
  type LinkSettings,
  type ProfileBlock,
  type TrackedLink,
} from '@/lib/links'

export function applyTrackedLinksToSettings(
  settings: LinkSettings,
  links: TrackedLink[],
  origin?: string,
): { settings: LinkSettings; blocks: ProfileBlock[]; added: number } {
  const extras = missingProfileBlocksFromLinks(settings.profile_blocks, links, origin)
  if (!extras.length) {
    return { settings, blocks: settings.profile_blocks, added: 0 }
  }
  const blocks = slimProfileBlocks([...settings.profile_blocks, ...extras])
  return { settings: { ...settings, profile_blocks: blocks }, blocks, added: extras.length }
}

export function persistProfileBlocksLater(userId: string, blocks: ProfileBlock[]) {
  void Promise.resolve(
    createAdminClient()
      .from('link_settings')
      .update({
        profile_blocks: blocks,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId),
  ).catch(() => undefined)
}

export async function syncProfileBlocksFromLinks(
  userId: string,
  links: TrackedLink[],
  origin?: string,
): Promise<{ settings: LinkSettings; blocks: ProfileBlock[]; added: number }> {
  const supabase = createAdminClient()
  const { data } = await supabase.from('link_settings').select('*').eq('user_id', userId).maybeSingle()
  const settings = normalizeLinkSettings((data || { user_id: userId }) as Record<string, unknown>)
  const extras = missingProfileBlocksFromLinks(settings.profile_blocks, links, origin)
  if (!extras.length) {
    return { settings, blocks: settings.profile_blocks, added: 0 }
  }

  const blocks = slimProfileBlocks([...settings.profile_blocks, ...extras])
  const { data: updated, error } = await supabase
    .from('link_settings')
    .update({
      profile_blocks: blocks,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .maybeSingle()

  if (error || !updated) {
    return { settings, blocks, added: extras.length }
  }

  const next = normalizeLinkSettings(updated as Record<string, unknown>)
  return { settings: next, blocks: next.profile_blocks, added: extras.length }
}
