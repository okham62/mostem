export default function ThreadsLoading() {
  return (
    <div className="grid animate-pulse grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="h-12 bg-[var(--muted-bg)]" />
          <div className="aspect-[4/5] bg-black/40" />
          <div className="space-y-2 p-3">
            <div className="h-4 rounded bg-[var(--muted-bg)]" />
            <div className="h-8 rounded bg-[var(--muted-bg)]" />
          </div>
        </div>
      ))}
    </div>
  )
}
