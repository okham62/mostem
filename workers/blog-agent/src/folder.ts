import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

export type WatchedFile = { abs: string; name: string; mtimeMs: number; size: number }

export function listStableImages(dir: string, settleMs = 2500): WatchedFile[] {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return []
  const now = Date.now()
  const entries = fs.readdirSync(dir)
  const files: WatchedFile[] = []
  for (const name of entries) {
    const abs = path.join(dir, name)
    let st: fs.Stats
    try {
      st = fs.statSync(abs)
    } catch {
      continue
    }
    if (!st.isFile()) continue
    const ext = path.extname(name).toLowerCase()
    if (!IMAGE_EXT.has(ext)) continue
    if (now - st.mtimeMs < settleMs) continue
    files.push({ abs, name, mtimeMs: st.mtimeMs, size: st.size })
  }
  files.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  return files
}

export function batchKey(files: WatchedFile[]) {
  const payload = files.map((f) => `${f.name}:${f.size}:${f.mtimeMs}`).join('|')
  return crypto.createHash('sha1').update(payload).digest('hex')
}

export function mimeFor(name: string) {
  const ext = path.extname(name).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  return 'image/jpeg'
}
