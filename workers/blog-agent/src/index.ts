import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { toggleCategoryVisibility } from './category'
import { batchKey, listStableImages, mimeFor } from './folder'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 0) continue
    const key = trimmed.slice(0, i).trim()
    const val = trimmed.slice(i + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnv()

const BASE = (process.env.MOSTEM_URL || 'https://www.mostem.kr').replace(/\/+$/, '')
const SECRET = process.env.BLOG_WORKER_SECRET || ''
const USER_ID = process.env.BLOG_AGENT_USER_ID || ''
const POLL_MS = Number(process.env.POLL_MS || 60_000)

if (!SECRET || !USER_ID) {
  console.error('BLOG_WORKER_SECRET and BLOG_AGENT_USER_ID are required in .env')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${SECRET}`,
  'x-blog-user-id': USER_ID,
}

async function api(pathname: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${pathname}`, {
    ...init,
    headers: { ...headers, ...(init?.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `${res.status} ${pathname}`)
  return data
}

async function tickAndClaim() {
  await api('/api/blog/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'tick' }),
  })

  const sync = await api('/api/blog/agent')
  const jobs = (sync.jobs || []) as Array<{
    id: string
    meta?: Record<string, unknown>
    keyword?: string
  }>

  for (const job of jobs) {
    const kind = String(job.meta?.kind || '')
    if (kind !== 'category_open' && kind !== 'category_close') continue

    await api('/api/blog/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'claim', id: job.id }),
    })

    const categoryName = String(job.meta?.categoryName || job.keyword || '')
    const blogId = String(job.meta?.blogId || '')
    const scheduleId = String(job.meta?.scheduleId || '')
    const open = kind === 'category_open'

    try {
      console.log(`[category] ${kind} → ${categoryName}`)
      const result = await toggleCategoryVisibility({ categoryName, blogId, open })
      console.log('[category] ok', result.screenshot)
      await api('/api/blog/agent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: job.id,
          status: 'done',
          scheduleId,
          kind,
        }),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[category] fail', message)
      await api('/api/blog/agent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: job.id,
          status: 'failed',
          error: message,
          scheduleId,
          kind,
        }),
      })
    }
  }

  return sync.folders as Array<{
    id: string
    local_path: string
    label?: string
    mode?: string
    last_batch_key?: string | null
  }>
}

async function processFolders(
  folders: Array<{
    id: string
    local_path: string
    label?: string
    mode?: string
    last_batch_key?: string | null
  }>
) {
  for (const folder of folders || []) {
    const dir = folder.local_path
    const files = listStableImages(dir)
    if (files.length < 1) continue
    const key = batchKey(files)
    if (folder.last_batch_key && folder.last_batch_key === key) continue

    console.log(`[folder] ${dir} → ${files.length} images`)
    const form = new FormData()
    form.set('topic', folder.label || path.basename(dir))
    form.set('mode', folder.mode || 'folder')
    form.set('folderId', folder.id)
    for (const file of files) {
      const buf = fs.readFileSync(file.abs)
      form.append(
        'images',
        new Blob([new Uint8Array(buf)], { type: mimeFor(file.name) }),
        file.name
      )
    }

    try {
      const res = await fetch(`${BASE}/api/blog/folder-generate`, {
        method: 'POST',
        headers,
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `folder-generate ${res.status}`)
      console.log('[folder] draft', data.post?.id || data.article?.title)
      await api('/api/blog/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'folder-ack', folderId: folder.id, batchKey: key }),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[folder] fail', message)
      await api('/api/blog/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'folder-ack', folderId: folder.id, error: message }),
      })
    }
  }
}

async function loop() {
  console.log(`Mostem blog agent → ${BASE} user=${USER_ID}`)
  for (;;) {
    try {
      const folders = await tickAndClaim()
      await processFolders(folders)
    } catch (error) {
      console.error('[loop]', error instanceof Error ? error.message : error)
    }
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
}

void loop()
