import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardProps) {
  return <div className={cn('mb-4', className)}>{children}</div>
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h3 className={cn('text-base font-semibold text-[var(--foreground)]', className)}>
      {children}
    </h3>
  )
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn('', className)}>{children}</div>
}
