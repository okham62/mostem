export default function HistoryLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-32 rounded-xl bg-[var(--muted-bg)]" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-[var(--muted-bg)]" />
      ))}
    </div>
  )
}
