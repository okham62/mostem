import { snsHref, snsKindOf, type SnsKind } from '@/lib/profile-sns'
import type { ProfileSnsLink } from '@/lib/links'

function Glyph({ kind }: { kind: SnsKind }) {
  const common = 'h-3.5 w-3.5'
  if (kind === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (kind === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="currentColor">
        <path d="M23 12.2s-.2-3.2-.8-4.6c-.5-1-1.6-1.2-2-1.3C17.2 6 12 6 12 6s-5.2 0-8.2.3c-.4.1-1.5.3-2 1.3C1.2 9 1 12.2 1 12.2s.2 3.2.8 4.6c.5 1 1.6 1.2 2 1.3 3 .3 8.2.3 8.2.3s5.2 0 8.2-.3c.4-.1 1.5-.3 2-1.3.6-1.4.8-4.6.8-4.6zM9.8 15.5v-6.6l6.3 3.3-6.3 3.3z" />
      </svg>
    )
  }
  if (kind === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="currentColor">
        <path d="M14.5 3c.4 2.4 1.8 4.1 4.1 4.4v2.5c-1.4 0-2.7-.4-3.8-1.2v6.6c0 3.3-2.6 5.7-5.8 5.7S3.2 18.6 3.2 15.3c0-3.2 2.5-5.6 5.6-5.7v2.6c-1.7.1-3 1.4-3 3.1 0 1.8 1.4 3.2 3.2 3.2s3.2-1.4 3.2-3.2V3h2.3z" />
      </svg>
    )
  }
  if (kind === 'x') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="currentColor">
        <path d="M14.7 10.3 21.6 2h-2.2l-5.7 6.8L9 2H3.2l7.3 11.1L3 22h2.2l6.2-7.4L15 22h5.8l-6.1-11.7zM11.9 13.4l-.8-1.1L6 3.7h2.6l4.1 6.1.8 1.1 5.5 8.2h-2.6l-4.5-6.7z" />
      </svg>
    )
  }
  if (kind === 'threads') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="currentColor">
        <path d="M16.4 11.3c-.1-2.6-1.6-4.1-4.4-4.1-3.3 0-5.2 2.1-5.2 5.8 0 3.6 1.8 5.7 5.3 5.7 1.8 0 3.2-.5 4.2-1.4v-1.7c-.8.7-1.9 1.1-3.3 1.1-2.3 0-3.7-1.3-3.7-3.7 0-2.4 1.4-3.8 3.6-3.8 1.8 0 3 .8 3.4 2.1h-2.3v1.5h4.4c0-2.1.1-3.5.1-4.6h-1.8c0 .8 0 1.8-.3 3.1zm.4 1.6v6.6h1.9V7.8h-1.9v5.1z" />
      </svg>
    )
  }
  if (kind === 'naver') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="currentColor">
        <path d="M7 5h3.6l3.5 5.4V5H18v14h-3.6L11 13.6V19H7V5z" />
      </svg>
    )
  }
  if (kind === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="currentColor">
        <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z" />
      </svg>
    )
  }
  if (kind === 'email') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    )
  }
  if (kind === 'phone') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6.5 3.5h3l1.2 3-2 1.4a12 12 0 0 0 6.4 6.4l1.4-2 3 1.2v3c0 .8-.6 1.5-1.4 1.5C8.8 18 6 15.2 6 5c0-.8.7-1.5 1.5-1.5z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
    </svg>
  )
}

export function ProfileSnsIcons({
  sns,
  size = 'md',
  align = 'center',
}: {
  sns: ProfileSnsLink[]
  size?: 'sm' | 'md'
  align?: 'left' | 'center'
}) {
  const items = sns.filter((s) => snsHref(s))
  if (!items.length) return null
  const box = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  return (
    <div className={`flex flex-wrap gap-2 ${align === 'left' ? 'justify-start' : 'justify-center'}`}>
      {items.map((s) => (
        <a
          key={s.id}
          href={snsHref(s)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${box} inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 text-current`}
          aria-label={s.label || snsKindOf(s)}
        >
          <Glyph kind={snsKindOf(s)} />
        </a>
      ))}
    </div>
  )
}
