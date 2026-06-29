import { Star, TrendingUp, TrendingDown, Minus, Clock, BarChart3 } from 'lucide-react'
import type { BriefMarket } from '../types'
import { useFollows } from '../lib/useBrief'
import CallControl from './CallControl'
import {
  formatPct,
  formatDelta,
  formatUsd,
  formatCloses,
  formatTopic,
} from '../lib/format'
import { cn } from '../components/ui/utils'

const POLYMARKET_BASE = 'https://polymarket.com/market/'

export default function MarketCard({ market }: { market: BriefMarket }) {
  const { isFollowing, toggle, canFollow } = useFollows()
  const followed = isFollowing('market', market.marketId)
  const topicFollowed = market.topic ? isFollowing('topic', market.topic) : false

  const delta = market.delta
  const deltaLabel = formatDelta(delta)
  const up = delta != null && delta > 0.0005
  const down = delta != null && delta < -0.0005
  const yesPct = Math.round(market.yesPrice * 100)

  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40">
      {/* Header: topic + follow star */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={!canFollow}
          onClick={() =>
            canFollow && toggle('topic', market.topic, formatTopic(market.topic), market.image)
          }
          className={cn(
            'inline-flex max-w-[70%] items-center gap-1.5 truncate rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
            topicFollowed
              ? 'border-primary/40 bg-primary/15 text-primary'
              : 'border-border bg-muted/60 text-muted-foreground',
            canFollow && 'hover:border-primary/40 hover:text-primary',
          )}
          title={canFollow ? `Follow topic: ${formatTopic(market.topic)}` : undefined}
        >
          <BarChart3 className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{formatTopic(market.topic)}</span>
        </button>

        {canFollow && (
          <button
            type="button"
            onClick={() =>
              toggle('market', market.marketId, market.question, market.image)
            }
            aria-pressed={followed}
            aria-label={followed ? 'Unfollow market' : 'Follow market'}
            className={cn(
              'shrink-0 rounded-full p-1.5 transition-colors',
              followed
                ? 'text-amber-400'
                : 'text-muted-foreground hover:text-amber-400',
            )}
          >
            <Star className={cn('h-4 w-4', followed && 'fill-current')} />
          </button>
        )}
      </div>

      {/* Question */}
      <a
        href={`${POLYMARKET_BASE}${market.slug}`}
        target="_blank"
        rel="noreferrer"
        className="text-[15px] font-semibold leading-snug tracking-tight text-foreground transition-colors hover:text-primary"
      >
        {market.question}
      </a>

      {/* Odds + delta */}
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {formatPct(market.yesPrice)}
          </div>
          <div className="text-xs text-muted-foreground">
            {market.outcomes[0] ?? 'Yes'} likely
          </div>
        </div>
        <DeltaBadge label={deltaLabel} up={up} down={down} source={market.deltaSource} />
      </div>

      {/* Probability bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            up ? 'bg-emerald-500' : down ? 'bg-rose-500' : 'bg-primary',
          )}
          style={{ width: `${Math.min(100, Math.max(2, yesPct))}%` }}
        />
      </div>

      {/* AI blurb */}
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        {market.blurb}
      </p>

      {/* Make-your-call control */}
      <CallControl market={market} />

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden />
          {formatUsd(market.volume24hr)} 24h
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {formatCloses(market.endDate)}
        </span>
      </div>
    </div>
  )
}

function DeltaBadge({
  label,
  up,
  down,
  source,
}: {
  label: string | null
  up: boolean
  down: boolean
  source: BriefMarket['deltaSource']
}) {
  if (!label || source === 'none') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <Minus className="h-3.5 w-3.5" aria-hidden />
        New
      </span>
    )
  }
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums',
        up && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        down && 'border-rose-500/30 bg-rose-500/10 text-rose-400',
        !up && !down && 'border-border bg-muted/60 text-muted-foreground',
      )}
      title={source === 'history' ? 'vs ~24h ago' : 'vs yesterday'}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  )
}
