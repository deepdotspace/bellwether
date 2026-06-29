/**
 * /daily — the Daily Five: a fresh set of markets to forecast each day,
 * with a streak that rewards showing up. The daily habit loop.
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Flame, CheckCircle2, Target, ArrowRight, Trophy } from 'lucide-react'
import { Progress, EmptyState, SkeletonCard } from '../../components/ui'
import MarketCard from '../../components/MarketCard'
import { useLatestBrief, selectDailyFive } from '../../lib/useBrief'
import { useCalls } from '../../lib/useCalls'
import { useStreak } from '../../lib/useStreak'
import { cn } from '../../components/ui/utils'

export default function DailyPage() {
  const { brief, loading } = useLatestBrief()
  const { byMarket } = useCalls()
  const { streak, active } = useStreak()

  const five = useMemo(() => selectDailyFive(brief), [brief])
  const done = five.filter((m) => byMarket.has(m.marketId)).length
  const complete = five.length > 0 && done === five.length

  return (
    <div className="min-h-full bg-background text-foreground">
      <StreakHeader
        current={streak?.currentStreak ?? 0}
        longest={streak?.longestStreak ?? 0}
        active={active}
        done={done}
        total={five.length}
        complete={complete}
      />

      <div className="mx-auto max-w-6xl px-6 pb-24">
        {loading ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : five.length === 0 ? (
          <div className="mt-16">
            <EmptyState
              icon={<Target className="h-6 w-6" />}
              title="No markets to forecast yet"
              description="Today's brief hasn't been published. Check back shortly."
              action={{ label: 'Go to the brief', onClick: () => (window.location.href = '/home') }}
            />
          </div>
        ) : (
          <>
            {complete && (
              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden />
                <div className="flex-1 text-sm">
                  <span className="font-semibold text-emerald-300">All five forecasted.</span>{' '}
                  <span className="text-muted-foreground">
                    Come back tomorrow to keep your streak alive — or track these on your scorecard.
                  </span>
                </div>
                <Link
                  to="/scorecard"
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-300 hover:text-emerald-200"
                >
                  Scorecard
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {five.map((m, i) => (
                <div key={m.marketId} className="relative">
                  <span
                    className={cn(
                      'absolute -left-2 -top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-2 ring-background',
                      byMarket.has(m.marketId)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-primary text-primary-foreground',
                    )}
                  >
                    {byMarket.has(m.marketId) ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </span>
                  <MarketCard market={m} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StreakHeader({
  current,
  longest,
  active,
  done,
  total,
  complete,
}: {
  current: number
  longest: number
  active: boolean
  done: number
  total: number
  complete: boolean
}) {
  return (
    <div className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]"
      />
      <div className="relative mx-auto max-w-6xl px-6 pb-8 pt-12">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h1 className="font-serif text-4xl font-bold tracking-tight">The Daily Five</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Five markets, one quick call each. Build the habit — your forecasts get scored when
              they resolve.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex items-center gap-3 rounded-2xl border px-5 py-3',
                active && current > 0
                  ? 'border-amber-500/40 bg-amber-500/10'
                  : 'border-border bg-card',
              )}
            >
              <Flame
                className={cn(
                  'h-7 w-7',
                  active && current > 0 ? 'text-amber-400' : 'text-muted-foreground',
                )}
                aria-hidden
              />
              <div>
                <div className="text-2xl font-bold leading-none tabular-nums">{current}</div>
                <div className="text-xs text-muted-foreground">
                  day{current === 1 ? '' : 's'} {active ? 'streak' : '(lapsed)'}
                </div>
              </div>
            </div>
            {longest > 0 && (
              <div className="hidden items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 sm:flex">
                <Trophy className="h-5 w-5 text-primary" aria-hidden />
                <div>
                  <div className="text-lg font-bold leading-none tabular-nums">{longest}</div>
                  <div className="text-xs text-muted-foreground">best</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {total > 0 && (
          <div className="mt-6 max-w-md">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium">
                {complete ? "Today's done" : `${done} of ${total} forecasted today`}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {Math.round((done / total) * 100)}%
              </span>
            </div>
            <Progress value={(done / total) * 100} />
          </div>
        )}
      </div>
    </div>
  )
}
