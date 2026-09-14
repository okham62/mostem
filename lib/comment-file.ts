import * as XLSX from 'xlsx'

const MAX_ROWS = 500
const MAX_CHARS = 60_000

export type CommentRow = {
  username: string
  text: string
  likes: number
}

function cellText(value: unknown) {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return String(value).trim()
}

function parseLikes(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value)
  const raw = cellText(value).replace(/,/g, '')
  if (!raw) return 0
  const match = raw.match(/([\d.]+)\s*(만|천|k|m)?/i)
  if (!match) return Number.parseFloat(raw) || 0
  const n = Number.parseFloat(match[1] || '0') || 0
  const unit = (match[2] || '').toLowerCase()
  if (unit === '만') return Math.round(n * 10000)
  if (unit === '천' || unit === 'k') return Math.round(n * 1000)
  if (unit === 'm') return Math.round(n * 1000000)
  return Math.round(n)
}

function headerIndex(headers: string[], aliases: string[]) {
  for (let i = 0; i < headers.length; i += 1) {
    const h = headers[i].replace(/\s+/g, '').toLowerCase()
    if (aliases.some((alias) => h.includes(alias))) return i
  }
  return -1
}

function rowsFromMatrix(matrix: unknown[][]): CommentRow[] {
  if (!matrix.length) return []
  const headerCells = (matrix[0] || []).map((cell) => cellText(cell))
  const hasHeader = headerCells.some((cell) =>
    /아이디|유저|username|댓글|내용|좋아요|likes|comment/i.test(cell)
  )
  const start = hasHeader ? 1 : 0
  const headers = hasHeader ? headerCells.map((cell) => cell.toLowerCase()) : []
  const userIdx = hasHeader
    ? headerIndex(headers, ['아이디', '유저', 'username', 'user', 'id', '작성자'])
    : 0
  const textIdx = hasHeader
    ? headerIndex(headers, ['댓글내용', '댓글', '내용', 'comment', 'text', '본문'])
    : 1
  const likesIdx = hasHeader
    ? headerIndex(headers, ['좋아요', 'likes', 'like', '추천'])
    : 2

  const rows: CommentRow[] = []
  for (let r = start; r < matrix.length; r += 1) {
    const line = matrix[r] || []
    const text = cellText(line[textIdx >= 0 ? textIdx : 1])
    if (!text) continue
    rows.push({
      username: cellText(line[userIdx >= 0 ? userIdx : 0]) || 'unknown',
      text,
      likes: parseLikes(line[likesIdx >= 0 ? likesIdx : 2]),
    })
  }
  return rows
}

function parseCsv(text: string): CommentRow[] {
  const workbook = XLSX.read(text, { type: 'string', FS: ',' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]
  return rowsFromMatrix(matrix)
}

function parseWorkbook(buffer: Buffer): CommentRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]
  return rowsFromMatrix(matrix)
}

/** Prefer high-like comments, then keep a readable transcript for Gemini. */
export function formatCommentDigest(rows: CommentRow[]) {
  const sorted = [...rows].sort((a, b) => b.likes - a.likes || b.text.length - a.text.length)
  const picked = sorted.slice(0, MAX_ROWS)
  const lines = picked.map(
    (row, index) => `${index + 1}. @${row.username} (좋아요 ${row.likes}) — ${row.text}`
  )
  let text = lines.join('\n')
  if (text.length > MAX_CHARS) text = `${text.slice(0, MAX_CHARS)}\n…(이하 생략)`
  return { text, count: picked.length, total: rows.length }
}

export function parseCommentAttachment(buffer: Buffer, filename: string) {
  const lower = filename.toLowerCase()
  let rows: CommentRow[] = []
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    rows = parseCsv(buffer.toString('utf8'))
  } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    rows = parseWorkbook(buffer)
  } else {
    throw new Error('댓글 파일은 xlsx/csv만 지원합니다.')
  }
  if (!rows.length) throw new Error('댓글 파일에서 내용을 읽지 못했습니다.')
  return formatCommentDigest(rows)
}

export function parseCommentAttachmentBase64(base64: string, filename: string) {
  const cleaned = base64.replace(/^data:[^;]+;base64,/, '')
  return parseCommentAttachment(Buffer.from(cleaned, 'base64'), filename)
}
