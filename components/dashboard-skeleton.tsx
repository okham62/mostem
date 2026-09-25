export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[920px] space-y-4 animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-white/10" />
      <div className="h-16 rounded-2xl bg-white/[0.06]" />
      <div className="h-28 rounded-2xl bg-white/[0.06]" />
      <div className="h-28 rounded-2xl bg-white/[0.06]" />
      <div className="h-28 rounded-2xl bg-white/[0.06]" />
    </div>
  )
}
