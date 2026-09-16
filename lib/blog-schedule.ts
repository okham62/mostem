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

function sameLocalDay(iso: string | null | undefined, ymd: string, timeZone: string) {
  if (!iso) return false
  return zonedParts(new Date(iso), timeZone).ymd === ymd
}

export type DueCategoryAction = {
  scheduleId: string
  kind: Extract<BlogJobKind, 'category_open' | 'category_close'>
  categoryName: string
  blogId: string
  accountId: string | null
  dateKey: string
}

/**
 * If local wall-clock is at/past open or close slot today and not yet run today, enqueue.
 * Window: from scheduled minute through +90 minutes (agent poll friendly).
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
    const nowMins = parts.hour * 60 + parts.minute
    const openMins = parseHm(schedule.open_time)
    const closeMins = parseHm(schedule.close_time)

    if (
      openMins != null &&
      parts.dow === schedule.open_dow &&
      nowMins >= openMins &&
      nowMins <= openMins + 90 &&
      !sameLocalDay(schedule.last_open_at, parts.ymd, tz)
    ) {
      out.push({
        scheduleId: schedule.id,
        kind: 'category_open',
        categoryName: schedule.category_name,
        blogId: schedule.blog_id,
        accountId: schedule.account_id,
        dateKey: parts.ymd,
      })
    }

    if (
      closeMins != null &&
      parts.dow === schedule.close_dow &&
      nowMins >= closeMins &&
      nowMins <= closeMins + 90 &&
      !sameLocalDay(schedule.last_close_at, parts.ymd, tz)
    ) {
      out.push({
        scheduleId: schedule.id,
        kind: 'category_close',
        categoryName: schedule.category_name,
        blogId: schedule.blog_id,
        accountId: schedule.account_id,
        dateKey: parts.ymd,
      })
    }
  }
  return out
}

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const
