export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-[var(--muted-bg)]" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-[var(--muted-bg)]" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-[var(--muted-bg)]" />
      <div className="h-48 rounded-2xl bg-[var(--muted-bg)]" />
    </div>
  )
}
