import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const port = Number(process.env.AGENT_LOCAL_PORT || 39217)
const memoryDir = path.join(os.homedir(), 'AppData', 'Local', 'mostem-blog-agent')
const memoryFile = path.join(memoryDir, 'last-folder.txt')

function readLastFolder() {
  try {
    const saved = fs.readFileSync(memoryFile, 'utf8').trim()
    return saved && fs.existsSync(saved) ? saved : ''
  } catch {
    return ''
  }
}

function writeLastFolder(folder) {
  fs.mkdirSync(memoryDir, { recursive: true })
  fs.writeFileSync(memoryFile, folder, 'utf8')
}

const scheduleFile = path.join(memoryDir, 'category-schedules.json')
let categoryBusy = false

function readScheduleStore() {
  try {
    const parsed = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'))
    return parsed && Array.isArray(parsed.items) ? parsed : { items: [] }
  } catch {
    return { items: [] }
  }
}

function writeScheduleStore(store) {
  fs.mkdirSync(memoryDir, { recursive: true })
  fs.writeFileSync(scheduleFile, JSON.stringify(store), 'utf8')
}

function laterIso(left, right) {
  const a = left ? new Date(left).getTime() : 0
  const b = right ? new Date(right).getTime() : 0
  if (!a && !b) return null
  return a >= b ? left : right
}

function seoulParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const map = {}
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value
  }
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    dow: weekdayMap[map.weekday || 'Sun'] ?? 0,
    ymd: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour),
    minute: Number(map.minute),
  }
}

function lastWeeklyInstant(dow, hm, now) {
  const match = String(hm || '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  const parts = seoulParts(now)
  const nowMins = parts.hour * 60 + parts.minute
  const target = hour * 60 + minute
  let daysBack = (parts.dow - Number(dow) + 7) % 7
  if (daysBack === 0 && nowMins < target) daysBack = 7
  const [year, month, day] = parts.ymd.split('-').map(Number)
  const anchor = new Date(Date.UTC(year, month - 1, day))
  anchor.setUTCDate(anchor.getUTCDate() - daysBack)
  return new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate(), hour - 9, minute, 0))
}

function dueCategoryItem(item, now = new Date()) {
  if (!item || item.enabled === false) return null
  const openAt = lastWeeklyInstant(item.openDow, item.openTime, now)
  const closeAt = lastWeeklyInstant(item.closeDow, item.closeTime, now)
  if (!openAt || !closeAt) return null
  const openWins = openAt.getTime() >= closeAt.getTime()
  const dueAt = openWins ? openAt : closeAt
  const appliedAt = openWins ? item.lastOpenAt : item.lastCloseAt
  if (appliedAt && new Date(appliedAt).getTime() >= dueAt.getTime()) return null
  if (item.lastAttemptAt && now.getTime() - Number(item.lastAttemptAt) < 60_000) return null
  return { open: openWins, dueAt: dueAt.toISOString() }
}

function saveScheduleResult(id, patch) {
  const store = readScheduleStore()
  const item = store.items.find((row) => row.id === id)
  if (!item) return
  Object.assign(item, patch)
  writeScheduleStore(store)
}

async function runDueCategories() {
  if (categoryBusy) return
  const typing = ['login', 'captcha', 'title', 'body', 'images', 'save', 'chrome']
  if (typing.includes(writeJob.phase)) return
  const due = readScheduleStore().items
    .map((item) => ({ item, due: dueCategoryItem(item) }))
    .filter((row) => row.due)
  if (!due.length) return
  categoryBusy = true
  try {
    const { setNaverCategoryVisibility } = await import('./naver-type.mjs')
    for (const row of due) {
      const item = row.item
      try {
        const result = await setNaverCategoryVisibility({
          blogId: item.blogId,
          loginId: item.loginId,
          password: item.password,
          categoryName: item.categoryName,
          open: row.due.open,
        })
        const stamp = new Date().toISOString()
        saveScheduleResult(item.id, row.due.open
          ? { lastOpenAt: stamp, lastError: null, lastAttemptAt: Date.now(), lastMessage: result.category || item.categoryName }
          : { lastCloseAt: stamp, lastError: null, lastAttemptAt: Date.now(), lastMessage: result.category || item.categoryName })
      } catch (error) {
        saveScheduleResult(item.id, {
          lastError: error instanceof Error ? error.message : '카테고리 설정을 바꾸지 못했습니다',
          lastAttemptAt: Date.now(),
        })
      }
    }
  } finally {
    categoryBusy = false
  }
}

setInterval(() => {
  void runDueCategories()
}, 20_000)

const imageExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

function mimeFor(name) {
  const ext = path.extname(name).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  return 'image/jpeg'
}

function listImages(dir, skip, limit) {
  const found = []
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name)
    let stat
    try {
      stat = fs.statSync(abs)
    } catch {
      continue
    }
    if (!stat.isFile() || !imageExt.has(path.extname(name).toLowerCase())) continue
    if (skip.has(name)) continue
    if (stat.size > 6 * 1024 * 1024) continue
    found.push({ name, abs, size: stat.size })
  }
  found.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  return found.slice(0, limit)
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    return {}
  }
}

let writeJob = { phase: 'idle', message: '' }

function cors(res, origin) {
  const allowed = !origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('mostem.kr')
  res.setHeader('Access-Control-Allow-Origin', allowed && origin ? origin : '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

async function pickFolderNative(startPath) {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = '블로그 이미지 폴더를 선택하세요'
$dialog.ShowNewFolderButton = $true
$dialog.UseDescriptionForTitle = $true
$dialog.RootFolder = [System.Environment+SpecialFolder]::MyComputer
$start = $env:MOSTEM_START_FOLDER
if ($start -and (Test-Path -LiteralPath $start)) {
  $dialog.SelectedPath = (Resolve-Path -LiteralPath $start).Path
}
$r = $dialog.ShowDialog()
if ($r -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  Write-Output $dialog.SelectedPath
}
`
  const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-STA', '-Command', script], {
    encoding: 'utf8',
    windowsHide: false,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, MOSTEM_START_FOLDER: startPath || '' },
  })
  const selected = String(stdout || '').trim()
  return selected || null
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin
  cors(res, origin)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`)
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok: true, service: 'mostem-blog-agent' }))
    return
  }
  if (url.pathname === '/write-status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(writeJob))
    return
  }
  if (url.pathname === '/folder-images' && req.method === 'POST') {
    try {
      const body = await readJson(req)
      const dir = typeof body.path === 'string' ? body.path.trim() : ''
      const skip = new Set(Array.isArray(body.skip) ? body.skip.map((name) => String(name)) : [])
      const limit = Math.min(10, Math.max(1, Number(body.limit) || 10))
      if (!dir || !fs.existsSync(dir)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: '폴더를 찾지 못했습니다' }))
        return
      }
      const files = listImages(dir, skip, limit).map((file) => ({
        name: file.name,
        path: file.abs,
        mime: mimeFor(file.name),
        base64: fs.readFileSync(file.abs).toString('base64'),
      }))
      if (!files.length) {
        const total = listImages(dir, new Set(), limit).length
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({
          ok: false,
          error: total
            ? '이 폴더의 사진은 이미 사용한 것으로 표시되어 있습니다. 새 사진을 넣어 주세요.'
            : '폴더에 이미지 파일이 없습니다',
        }))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: true, files }))
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : '이미지 읽기 실패' }))
    }
    return
  }
  if (url.pathname === '/captcha-answer' && req.method === 'POST') {
    const body = await readJson(req)
    const { provideCaptchaAnswer } = await import('./naver-type.mjs')
    const ok = provideCaptchaAnswer(body.answer)
    res.writeHead(ok ? 200 : 409, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok }))
    return
  }
  if (url.pathname === '/open-chrome' && req.method === 'POST') {
    const body = await readJson(req)
    const typing = ['login', 'captcha', 'title', 'body', 'images', 'save']
    const { chromeAlive, resetNaverSession } = await import('./naver-type.mjs')
    const alive = await chromeAlive()
    if (categoryBusy) {
      res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: '카테고리 공개 설정을 바꾸는 중입니다' }))
      return
    }
    if (!alive) {
      resetNaverSession()
      writeJob = { phase: 'idle', message: '' }
    } else if (typing.includes(writeJob.phase)) {
      res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: '이미 크롬에서 글을 쓰는 중입니다' }))
      return
    }
    writeJob = { phase: 'chrome', message: '크롬 창을 여는 중' }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok: true }))
    import('./naver-type.mjs')
      .then(({ beginNaver }) =>
        beginNaver(
          {
            blogId: String(body.blogId || ''),
            loginId: String(body.loginId || ''),
            password: String(body.password || ''),
            title: String(body.title || ''),
            fresh: Boolean(body.fresh),
          },
          (status) => {
            writeJob = status
          }
        )
      )
      .catch((error) => {
        writeJob = { phase: 'error', message: error instanceof Error ? error.message : '크롬 열기 실패' }
      })
    return
  }
  if (url.pathname === '/login-account' && req.method === 'POST') {
    const body = await readJson(req)
    const typing = ['login', 'captcha', 'title', 'body', 'images', 'save']
    const { chromeAlive, resetNaverSession } = await import('./naver-type.mjs')
    const alive = await chromeAlive()
    if (categoryBusy) {
      res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: '카테고리 공개 설정을 바꾸는 중입니다' }))
      return
    }
    if (alive && typing.includes(writeJob.phase)) {
      res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: '이미 크롬에서 글을 쓰는 중입니다' }))
      return
    }
    resetNaverSession()
    writeJob = { phase: 'chrome', message: '로그인 창을 여는 중' }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok: true }))
    import('./naver-type.mjs')
      .then(({ loginNaverAccount }) =>
        loginNaverAccount(
          {
            blogId: String(body.blogId || ''),
            loginId: String(body.loginId || ''),
            password: String(body.password || ''),
          },
          (status) => {
            writeJob = status
          }
        )
      )
      .catch((error) => {
        writeJob = { phase: 'error', message: error instanceof Error ? error.message : '로그인 실패' }
      })
    return
  }
  if (url.pathname === '/write-post' && req.method === 'POST') {
    const body = await readJson(req)
    if (categoryBusy) {
      res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: '카테고리 공개 설정을 바꾸는 중입니다' }))
      return
    }
    if (['title', 'body', 'images', 'save'].includes(writeJob.phase)) {
      const { chromeAlive, resetNaverSession } = await import('./naver-type.mjs')
      if (await chromeAlive()) {
        res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: '이미 크롬에서 글을 쓰는 중입니다' }))
        return
      }
      resetNaverSession()
      writeJob = { phase: 'idle', message: '' }
    }
    if (!writeJob.phase || ['idle', 'done', 'error'].includes(writeJob.phase)) {
      writeJob = { phase: 'chrome', message: '크롬 창을 여는 중' }
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok: true }))
    import('./naver-type.mjs')
      .then(({ typeNaverPost }) =>
        typeNaverPost(
          {
            blogId: String(body.blogId || ''),
            loginId: String(body.loginId || ''),
            password: String(body.password || ''),
            title: String(body.title || ''),
            skipTitle: Boolean(body.skipTitle),
            paragraphs: Array.isArray(body.paragraphs) ? body.paragraphs.map((line) => String(line)) : [],
            imagePaths: Array.isArray(body.imagePaths) ? body.imagePaths.map((line) => String(line)) : [],
            hashtags: String(body.hashtags || ''),
            finish: body.finish === 'schedule' ? 'schedule' : 'draft',
            scheduleAt: String(body.scheduleAt || ''),
            blocks: Array.isArray(body.blocks)
              ? body.blocks.map((item) => ({
                  imagePath: String(item?.imagePath || ''),
                  text: String(item?.text || ''),
                }))
              : [],
          },
          (status) => {
            writeJob = status
          }
        )
      )
      .catch((error) => {
        writeJob = { phase: 'error', message: error instanceof Error ? error.message : '크롬 글쓰기 실패' }
      })
    return
  }
  if (url.pathname === '/category-schedules' && req.method === 'GET') {
    const store = readScheduleStore()
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      ok: true,
      items: store.items.map((item) => ({
        id: item.id,
        lastOpenAt: item.lastOpenAt || null,
        lastCloseAt: item.lastCloseAt || null,
        lastError: item.lastError || null,
        lastMessage: item.lastMessage || null,
      })),
    }))
    return
  }
  if (url.pathname === '/category-schedules' && req.method === 'POST') {
    const body = await readJson(req)
    const incoming = Array.isArray(body.items) ? body.items : []
    const prev = readScheduleStore()
    const prevById = new Map(prev.items.map((item) => [item.id, item]))
    const items = incoming
      .map((item) => {
        const id = String(item.id || '')
        if (!id) return null
        const old = prevById.get(id)
        return {
          id,
          categoryName: String(item.categoryName || ''),
          blogId: String(item.blogId || ''),
          loginId: String(item.loginId || ''),
          password: String(item.password || ''),
          openDow: Number(item.openDow),
          openTime: String(item.openTime || ''),
          closeDow: Number(item.closeDow),
          closeTime: String(item.closeTime || ''),
          enabled: item.enabled !== false,
          lastOpenAt: laterIso(old?.lastOpenAt, item.lastOpenAt),
          lastCloseAt: laterIso(old?.lastCloseAt, item.lastCloseAt),
          lastError: old?.lastError || null,
          lastAttemptAt: old?.lastAttemptAt || null,
          lastMessage: old?.lastMessage || null,
        }
      })
      .filter(Boolean)
    writeScheduleStore({ items })
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok: true, count: items.length }))
    setTimeout(() => { void runDueCategories() }, 500)
    return
  }
  if (url.pathname === '/pick-folder' && (req.method === 'GET' || req.method === 'POST')) {
    try {
      const body = await readJson(req)
      let requested = typeof body.path === 'string' ? body.path.trim() : ''
      const startPath = requested && fs.existsSync(requested) ? requested : readLastFolder()
      const selected = await pickFolderNative(startPath)
      if (selected) writeLastFolder(selected)
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: true, path: selected }))
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : '폴더 선택 실패' }))
    }
    return
  }
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ error: 'not found' }))
})

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') process.exit(0)
  console.error(err)
  process.exit(1)
})

server.listen(port, '127.0.0.1')
