import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from './ui/utils'

/**
 * A designed, on-brand odds visual — the level, the overnight move, and a bar
 * showing where it came from. Used in the Edition stories and the briefing lead
 * (in place of unreliable market/news artwork).
 */
export default function OddsPanel({
  outcomeLabel,
  yesPrice,
  delta,
  className,
}: {
  outcomeLabel: string
  yesPrice: number
  delta: number | null
  className?: string
}) {
  const pct = Math.round(yesPrice * 100)
  const up = delta != null && delta > 0.0005
  const down = delta != null && delta < -0.0005
  const moved = delta != null && Math.abs(delta) > 0.005
  const from = delta != null ? Math.max(0, Math.min(1, yesPrice - delta)) : null
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus

  return (
    <div className={cn('rounded-2xl border border-border bg-card/60 px-5 py-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            chance of {outcomeLabel}
          </div>
          <div className="mt-1 font-serif text-5xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
            {pct}
            <span className="text-2xl text-muted-foreground">%</span>
          </div>
        </div>
        {up || down ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-semibold tabular-nums',
              up
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-400',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {up ? '+' : '−'}
            {Math.abs((delta ?? 0) * 100).toFixed(0)} pts
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Minus className="h-3.5 w-3.5" aria-hidden />
            {delta == null ? 'new' : 'flat overnight'}
          </span>
        )}
      </div>

      <div className="relative mt-4 h-2.5 w-full rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        />
        {from != null && moved && (
          <span
            className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-muted-foreground"
            style={{ left: `${Math.max(0, Math.min(100, from * 100))}%` }}
            aria-hidden
          />
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>
          {from != null && moved ? `from ${Math.round(from * 100)}% yesterday` : '0%'}
        </span>
        <span>100%</span>
      </div>
    </div>
  )
}
