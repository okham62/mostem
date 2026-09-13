const KEY = (postId: string) => `mostem-schedule:${postId}`

export function parseScheduleDate(value?: string | null): Date | null {
  if (!value) return null
  const when = new Date(value)
  return Number.isNaN(when.getTime()) ? null : when
}

export function readStoredSchedule(postId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(KEY(postId))
  } catch {
    return null
  }
}

export function writeStoredSchedule(postId: string, iso: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY(postId), iso)
  } catch {
    // ignore
  }
}

export function clearStoredSchedule(postId: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY(postId))
  } catch {
    // ignore
  }
}

/** Prefer DB value; fall back to localStorage when status is scheduled but column is empty. */
export function resolveScheduledAt(post: {
  id: string
  status?: string
  scheduled_at?: string | null
}): string | null {
  const fromDb = parseScheduleDate(post.scheduled_at)
  if (fromDb) return fromDb.toISOString()
  if (post.status !== 'scheduled') return null
  const stored = readStoredSchedule(post.id)
  return parseScheduleDate(stored) ? stored : null
}

export function formatScheduleNotice(when: Date, username?: string | null) {
  const handle = username?.replace(/^@/, '')
  return handle
    ? `${when.toLocaleString('ko-KR')}에 @${handle} 계정으로 예약했습니다.`
    : `${when.toLocaleString('ko-KR')}에 예약했습니다.`
}

export function formatScheduleCardDate(iso: string) {
  const when = parseScheduleDate(iso)
  if (!when) return ''
  return when.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Compact time for the 예약 badge, e.g. "오후 5:30". */
export function formatScheduleBadgeTime(iso: string) {
  const when = parseScheduleDate(iso)
  if (!when) return ''
  return when.toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Merge localStorage schedule onto API posts that are scheduled but missing scheduled_at. */
export function hydrateScheduledPosts<T extends { id: string; status?: string; scheduled_at?: string | null }>(
  posts: T[],
): T[] {
  if (typeof window === 'undefined') return posts
  return posts.map((post) => {
    if (post.status !== 'scheduled') return post
    if (parseScheduleDate(post.scheduled_at)) return post
    const stored = readStoredSchedule(post.id)
    if (!parseScheduleDate(stored)) return post
    return { ...post, scheduled_at: stored }
  })
}
