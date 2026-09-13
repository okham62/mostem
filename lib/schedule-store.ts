import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'mostem-meta'
const pathFor = (userId: string) => `schedules/${userId}.json`

async function ensureBucket() {
  const supabase = createAdminClient()
  const { data } = await supabase.storage.listBuckets()
  if (data?.some((b) => b.name === BUCKET || b.id === BUCKET)) return
  await supabase.storage.createBucket(BUCKET, { public: false })
}

export async function readScheduleMap(userId: string): Promise<Record<string, string>> {
  try {
    await ensureBucket()
    const supabase = createAdminClient()
    const { data, error } = await supabase.storage.from(BUCKET).download(pathFor(userId))
    if (error || !data) return {}
    const text = await data.text()
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) out[key] = value
    }
    return out
  } catch {
    return {}
  }
}

export async function writeScheduleMap(userId: string, map: Record<string, string>) {
  await ensureBucket()
  const supabase = createAdminClient()
  const body = JSON.stringify(map)
  const { error } = await supabase.storage.from(BUCKET).upload(pathFor(userId), body, {
    contentType: 'application/json',
    upsert: true,
  })
  if (error) throw new Error(error.message)
}

export async function setStoredScheduleAt(userId: string, postId: string, iso: string | null) {
  const map = await readScheduleMap(userId)
  if (iso) map[postId] = iso
  else delete map[postId]
  await writeScheduleMap(userId, map)
}

export function attachScheduleTimes<T extends { id: string; status?: string; scheduled_at?: string | null }>(
  posts: T[],
  map: Record<string, string>,
): T[] {
  return posts.map((post) => {
    if (post.status !== 'scheduled') return post
    if (typeof post.scheduled_at === 'string' && post.scheduled_at) return post
    const iso = map[post.id]
    if (!iso) return post
    return { ...post, scheduled_at: iso }
  })
}
