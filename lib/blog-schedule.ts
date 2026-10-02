import type { BlogCategoryScheduleRow, BlogJobKind, Weekday } from './blog-types'

/** Parts of "now" in Asia/Seoul (or given IANA tz with Intl). */
export function zonedParts(date = new Date(), timeZone = 'Asia/Seoul') {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const map: Record<string, string> = {}
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value
  }
  const weekdayMap: Record<string, Weekday> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  const dow = weekdayMap[map.weekday || 'Sun'] ?? 0
  const ymd = `${map.year}-${map.month}-${map.day}`
  const hm = `${map.hour}:${map.minute}`
  return { dow, ymd, hm, hour: Number(map.hour), minute: Number(map.minute) }
}

function parseHm(value: string) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return hour * 60 + minute
}

export type DueCategoryAction = {
  scheduleId: string
  kind: Extract<BlogJobKind, 'category_open' | 'category_close'>
  categoryName: string
  blogId: string
  accountId: string | null
  dateKey: string
}

function seoulInstant(ymd: string, hm: string) {
  const [year, month, day] = ymd.split('-').map(Number)
  const [hour, minute] = hm.split(':').map(Number)
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute, 0))
}

/** Most recent Asia/Seoul weekday+time that is not after `now`. */
function lastWeeklyInstant(dow: number, hm: string, now: Date, timeZone: string) {
  const parts = zonedParts(now, timeZone)
  const target = parseHm(hm)
  if (target == null) return null
  const nowMins = parts.hour * 60 + parts.minute
  let daysBack = (parts.dow - dow + 7) % 7
  if (daysBack === 0 && nowMins < target) daysBack = 7
  const [year, month, day] = parts.ymd.split('-').map(Number)
  const anchor = new Date(Date.UTC(year, month - 1, day))
  anchor.setUTCDate(anchor.getUTCDate() - daysBack)
  const y = anchor.getUTCFullYear()
  const m = String(anchor.getUTCMonth() + 1).padStart(2, '0')
  const d = String(anchor.getUTCDate()).padStart(2, '0')
  return seoulInstant(`${y}-${m}-${d}`, hm)
}

/**
 * The latest of this week's open/close times decides the category.
 * If that moment has passed and has not been applied yet, it is due
 * until the next opposite time.
 */
export function dueCategoryActions(
  schedules: BlogCategoryScheduleRow[],
  now = new Date()
): DueCategoryAction[] {
  const out: DueCategoryAction[] = []
  for (const schedule of schedules) {
    if (!schedule.enabled) continue
    const tz = schedule.timezone || 'Asia/Seoul'
    const parts = zonedParts(now, tz)
    const openAt = lastWeeklyInstant(schedule.open_dow, schedule.open_time, now, tz)
    const closeAt = lastWeeklyInstant(schedule.close_dow, schedule.close_time, now, tz)
    if (!openAt || !closeAt) continue
    const openWins = openAt.getTime() >= closeAt.getTime()
    const dueAt = openWins ? openAt : closeAt
    const appliedAt = openWins ? schedule.last_open_at : schedule.last_close_at
    if (appliedAt && new Date(appliedAt).getTime() >= dueAt.getTime()) continue
    out.push({
      scheduleId: schedule.id,
      kind: openWins ? 'category_open' : 'category_close',
      categoryName: schedule.category_name,
      blogId: schedule.blog_id,
      accountId: schedule.account_id,
      dateKey: `${parts.ymd}:${openWins ? 'open' : 'close'}:${dueAt.toISOString()}`,
    })
  }
  return out
}

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const
