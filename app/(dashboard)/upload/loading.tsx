export default function UploadLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-pulse">
      <div className="h-8 w-32 rounded-xl bg-[var(--muted-bg)]" />
      <div className="h-40 rounded-2xl bg-[var(--muted-bg)]" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-[var(--muted-bg)]" />
        ))}
      </div>
      <div className="h-12 rounded-xl bg-[var(--muted-bg)]" />
    </div>
  )
}
