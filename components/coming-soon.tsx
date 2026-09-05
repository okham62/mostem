export function ComingSoon({
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-white/45">{description}</p>
      <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center text-sm text-white/40">
        준비중...
      </div>
    </div>
  )
}
