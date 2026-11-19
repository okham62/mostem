import { unstable_cache } from 'next/cache'

/**
 * Cache shared by every server instance (Next/Vercel Data Cache), stale-while-revalidate:
 * after `revalidate` seconds the old value is still answered instantly and a fresh one is fetched
 * in the background. The per-instance `let cache` in the data libs is empty on every cold start,
 * which made menu clicks wait for Naver/Google/shop sites; this keeps one warm copy for everyone.
 *
 * Only results that pass `good` are stored, so a failed fetch never replaces a good copy.
 * Arguments are part of the cache key. Use only for data that is the same for every user.
 */
export function sharedCache<A extends unknown[], R>(
  key: string,
  revalidate: number,
  fn: (...args: A) => Promise<R>,
  good: (result: R) => boolean = () => true,
) {
  return async (...args: A): Promise<R> => {
    let raw: R | undefined
    let called = false
    const cached = unstable_cache(
      async (...inner: A) => {
        called = true
        raw = await fn(...inner)
        if (!good(raw)) throw new Error(`${key}: not cacheable`)
        return raw
      },
      [key],
      { revalidate },
    )
    try {
      return await cached(...args)
    } catch (error) {
      if (raw !== undefined) return raw
      if (called) throw error
      // Data cache unavailable (e.g. local scripts) — fetch directly.
      return fn(...args)
    }
  }
}
