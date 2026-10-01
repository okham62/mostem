import http from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const port = Number(process.env.AGENT_LOCAL_PORT || 39217)

function cors(res, origin) {
  const allowed = !origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('mostem.kr')
  res.setHeader('Access-Control-Allow-Origin', allowed && origin ? origin : '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

async function pickFolderNative() {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = '블로그 이미지 폴더를 선택하세요'
$dialog.ShowNewFolderButton = $true
$dialog.UseDescriptionForTitle = $true
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
  if (url.pathname === '/pick-folder' && (req.method === 'GET' || req.method === 'POST')) {
    try {
      const selected = await pickFolderNative()
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
