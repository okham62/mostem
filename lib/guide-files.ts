import { strFromU8, unzipSync } from 'fflate'
import * as XLSX from 'xlsx'
import { MAX_GUIDE_FILES, type AiGuideFile } from '@/lib/ai-guides'

export { MAX_GUIDE_FILES }
export const MAX_GUIDE_FILE_BYTES = 4 * 1024 * 1024
export const MAX_GUIDE_FILE_CHARS = 40_000
export const MAX_GUIDE_DIGEST_CHARS = 400_000

const MARK = '__mostem_ai_guide_v1'

type Envelope = {
  [MARK]: true
  content: string
  files: AiGuideFile[]
}

export function encodeGuideBody(content: string, files: AiGuideFile[]) {
  if (!files.length) return content
  const payload: Envelope = { [MARK]: true, content, files }
  return JSON.stringify(payload)
}

export function decodeGuideBody(raw: string): { content: string; files: AiGuideFile[] } {
  try {
    const parsed = JSON.parse(raw) as Partial<Envelope>
    if (parsed && parsed[MARK] === true && typeof parsed.content === 'string') {
      return {
        content: parsed.content,
        files: Array.isArray(parsed.files) ? parsed.files.filter(isGuideFile) : [],
      }
    }
  } catch {
    /* plain text guide */
  }
  return { content: raw, files: [] }
}

export function publicGuideFiles(files: AiGuideFile[] = []): AiGuideFile[] {
  return files.map((file) => ({
    id: file.id,
    name: file.name,
    mime: file.mime,
    size: file.size,
    updatedAt: file.updatedAt,
  }))
}

export function filesDigest(files: AiGuideFile[] = []) {
  return files
    .filter((file) => file.text?.trim())
    .map((file) => `파일: ${file.name}\n${file.text!.trim()}`)
    .join('\n\n')
    .slice(0, MAX_GUIDE_DIGEST_CHARS)
}

export function extractGuideFileText(name: string, bytes: Buffer) {
  const lower = name.toLowerCase()
  if (/\.(txt|md|csv|json|html|htm|log)$/.test(lower)) {
    return cleanText(bytes.toString('utf8'))
  }
  if (/\.(xlsx|xls)$/.test(lower)) return extractSheet(bytes)
  if (/\.docx$/.test(lower)) return extractDocx(bytes)
  if (/\.pptx$/.test(lower)) return extractPptx(bytes)
  if (/\.(ppt|doc)$/.test(lower)) return extractOleText(bytes, lower.endsWith('.ppt') ? 'ppt' : 'doc')
  if (/\.pdf$/.test(lower)) return extractPdf(bytes)
  throw new Error('엑셀(xlsx, xls), 워드(docx), PPT(pptx), pdf, txt만 올릴 수 있어요.')
}

function isGuideFile(value: unknown): value is AiGuideFile {
  const row = value as AiGuideFile
  return Boolean(row && typeof row.id === 'string' && typeof row.name === 'string')
}

function cleanText(text: string) {
  return text.replace(/\0/g, '').replace(/\r\n/g, '\n').trim().slice(0, MAX_GUIDE_FILE_CHARS)
}

function extractSheet(bytes: Buffer) {
  const workbook = XLSX.read(bytes, { type: 'buffer' })
  const parts = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name]
    const csv = sheet ? XLSX.utils.sheet_to_csv(sheet) : ''
    return `# ${name}\n${csv}`
  })
  const text = cleanText(parts.join('\n\n'))
  if (!text) throw new Error('스프레드시트에서 글을 읽지 못했습니다.')
  return text
}

function extractDocx(bytes: Buffer) {
  const zip = unzipSync(new Uint8Array(bytes))
  const xml = zip['word/document.xml']
  if (!xml) throw new Error('docx를 읽지 못했습니다.')
  const text = cleanText(
    strFromU8(xml)
      .replace(/<w:tab[^/]*\/>/g, '\t')
      .replace(/<w:br[^/]*\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'"),
  )
  if (!text) throw new Error('docx에서 글을 읽지 못했습니다.')
  return text
}

function extractPptx(bytes: Buffer) {
  const zip = unzipSync(new Uint8Array(bytes))
  const slides = Object.keys(zip)
    .filter((key) => /^ppt\/slides\/slide\d+\.xml$/.test(key))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const parts = slides.map((key, index) => {
    const xml = strFromU8(zip[key]!)
    const text = xml
      .replace(/<\/a:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
    return `# 슬라이드 ${index + 1}\n${text.trim()}`
  })
  const notes = Object.keys(zip)
    .filter((key) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(key))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((key, index) => {
      const xml = strFromU8(zip[key]!)
      const text = xml.replace(/<\/a:p>/g, '\n').replace(/<[^>]+>/g, '')
      return text.trim() ? `# 노트 ${index + 1}\n${text.trim()}` : ''
    })
  const text = cleanText([...parts, ...notes].filter(Boolean).join('\n\n'))
  if (!text) throw new Error('PPT에서 글을 읽지 못했습니다.')
  return text
}

function extractOleText(bytes: Buffer, kind: 'ppt' | 'doc') {
  const utf16 = bytes.toString('utf16le')
  const ascii = bytes.toString('latin1')
  const chunks: string[] = []
  const utf16Re = /[\u0020-\u007E가-힣]{4,}/g
  const asciiRe = /[A-Za-z0-9가-힣 .,!?'"()\-]{6,}/g
  let match: RegExpExecArray | null
  while ((match = utf16Re.exec(utf16))) chunks.push(match[0])
  while ((match = asciiRe.exec(ascii))) chunks.push(match[0])
  const text = cleanText(chunks.join('\n'))
  if (text.length < 20) {
    throw new Error(
      kind === 'ppt'
        ? '이 PPT에서 글을 읽지 못했습니다. pptx로 저장해 올려 주세요.'
        : '이 워드 파일에서 글을 읽지 못했습니다. docx로 저장해 올려 주세요.',
    )
  }
  return text
}

function extractPdf(bytes: Buffer) {
  const raw = bytes.toString('latin1')
  const chunks: string[] = []
  const re = /\(((?:\\.|[^\\)]){2,240})\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(raw))) {
    const piece = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\(.)/g, '$1')
    if (/[A-Za-z가-힣]{2,}/.test(piece)) chunks.push(piece)
  }
  const text = cleanText(chunks.join(' '))
  if (text.length < 20) {
    throw new Error('이 PDF에서 글을 읽지 못했습니다. txt나 docx로 올려 주세요.')
  }
  return text
}
