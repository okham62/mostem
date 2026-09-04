export function NewsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-[var(--muted-bg)]" />
      <div className="h-14 rounded-xl bg-[var(--muted-bg)]" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl bg-[var(--muted-bg)]">
            <div className="aspect-[16/9]" />
            <div className="space-y-2 p-3.5">
              <div className="h-4 rounded bg-white/5" />
              <div className="h-3 w-1/2 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
