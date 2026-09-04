export function ShoppingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-[var(--muted-bg)]" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, col) => (
          <div key={col} className="space-y-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="h-5 w-28 rounded bg-white/5" />
            {Array.from({ length: 2 }).map((_, section) => (
              <div key={section} className="space-y-3">
                <div className="h-4 w-24 rounded bg-white/5" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-xl bg-[var(--muted-bg)]">
                      <div className="aspect-square" />
                      <div className="space-y-2 p-2.5">
                        <div className="h-3 rounded bg-white/5" />
                        <div className="h-3 w-1/2 rounded bg-white/5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
