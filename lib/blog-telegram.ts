import 'server-only'

export async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()
  if (!token || !chatId) return { ok: false as const, skipped: true }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: false,
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    const raw = await res.text().catch(() => '')
    return { ok: false as const, skipped: false, error: raw.slice(0, 200) }
  }
  return { ok: true as const, skipped: false }
}
