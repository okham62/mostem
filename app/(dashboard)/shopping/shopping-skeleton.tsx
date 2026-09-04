export function ShoppingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-[var(--muted-bg)]" />
      {Array.from({ length: 2 }).map((_, section) => (
        <div key={section} className="space-y-5">
          <div className="h-5 w-28 rounded bg-[var(--muted-bg)]" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
      ))}
    </div>
  )
}
