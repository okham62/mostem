import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'gif-workspace'

export async function ensureGifBucket() {
  const supabase = createAdminClient()
  const { data } = await supabase.storage.listBuckets()
  if (data?.some((b) => b.name === BUCKET || b.id === BUCKET)) return
  await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 52_428_800, // 50MB
  })
}

export function gifJobPrefix(userId: string, jobId: string) {
  return `${userId}/${jobId}`
}

export async function uploadGifBytes(
  userId: string,
  jobId: string,
  filename: string,
  body: Blob | ArrayBuffer | Buffer,
  contentType: string
) {
  await ensureGifBucket()
  const supabase = createAdminClient()
  const path = `${gifJobPrefix(userId, jobId)}/${filename}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType,
    upsert: true,
  })
  if (error) throw new Error(error.message)
  return path
}

export async function signedGifUrl(path: string, expiresIn = 60 * 60 * 24 * 7) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) throw new Error(error?.message || 'signed url failed')
  return data.signedUrl
}

export async function downloadGifPath(path: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error || !data) throw new Error(error?.message || 'download failed')
  return data
}

export { BUCKET as GIF_BUCKET }
