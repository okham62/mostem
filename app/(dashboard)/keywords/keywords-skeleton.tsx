export function KeywordsSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-[var(--muted-bg)]" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-[70vh] rounded-2xl bg-[var(--muted-bg)]" />
        <div className="h-[70vh] rounded-2xl bg-[var(--muted-bg)]" />
      </div>
    </div>
  )
}
