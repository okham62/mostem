import http from 'node:http'
import { pickFolderNative } from './pick-folder'

const DEFAULT_PORT = 39217

function cors(res: http.ServerResponse, origin: string | undefined) {
  const allowed =
    !origin ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('mostem.kr')
  res.setHeader('Access-Control-Allow-Origin', allowed && origin ? origin : '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

export function startLocalPickerServer(port = Number(process.env.AGENT_LOCAL_PORT || DEFAULT_PORT)) {
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
        res.end(
          JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : '폴더 선택 실패',
          })
        )
      }
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: 'not found' }))
  })

  server.listen(port, '127.0.0.1', () => {
    console.log(`[local] folder picker http://127.0.0.1:${port}/pick-folder`)
  })

  server.on('error', (err) => {
    console.error('[local] picker server failed', err.message)
  })

  return server
}
