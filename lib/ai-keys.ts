// Server-only: importing this from a client component fails the build, so provider
// keys can never end up in a browser bundle.
import 'server-only'

function clean(value?: string) {
  const key = (value ?? '').trim()
  return key && !key.includes('your_') ? key : ''
}

export function claudeKey() {
  return clean(process.env.ANTHROPIC_API_KEY)
}

export function geminiKey() {
  return clean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
}

/** Provider errors and logs must never carry a key, even if one gets echoed back. */
export function scrubSecrets(text: string) {
  let out = text
  for (const key of [claudeKey(), geminiKey()]) {
    if (key) out = out.split(key).join('***')
  }
  return out
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '***')
    .replace(/sk-ant-[0-9A-Za-z_-]{10,}/g, '***')
}
