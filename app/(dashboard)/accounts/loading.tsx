export default function AccountsLoading() {
  return (
    <div className="max-w-2xl space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-[var(--muted-bg)]" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 w-24 rounded-lg bg-[var(--muted-bg)]" />
          <div className="h-20 rounded-2xl bg-[var(--muted-bg)]" />
        </div>
      ))}
    </div>
  )
}
