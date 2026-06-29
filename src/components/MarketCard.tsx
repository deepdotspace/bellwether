import { useState } from 'react'
import { Star, TrendingUp, TrendingDown, Minus, Clock, BarChart3, Newspaper } from 'lucide-react'
import type { BriefMarket } from '../types'
import { useFollows } from '../lib/useBrief'
import CallControl from './CallControl'
import AnalystModal from './AnalystModal'
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
  const [analystOpen, setAnalystOpen] = useState(false)
  const followed = isFollowing('market', market.marketId)
  const topicFollowed = market.topic ? isFollowing('topic', market.topic) : false

  const delta = market.delta
  const deltaLabel = formatDelta(delta)
  const up = delta != null && delta > 0.0005
  const down = delta != null && delta < -0.0005
  const yesPct = Math.round(market.yesPrice * 100)

  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.75)]">
      {/* Header: topic dateline + actions */}
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={!canFollow}
          onClick={() =>
            canFollow && toggle('topic', market.topic, formatTopic(market.topic), market.image)
          }
          className={cn(
            'inline-flex max-w-[70%] items-center gap-1.5 truncate text-[0.7rem] font-semibold uppercase tracking-[0.1em] transition-colors',
            topicFollowed ? 'text-primary' : 'text-muted-foreground',
            canFollow && 'hover:text-primary',
          )}
          title={canFollow ? `Follow topic: ${formatTopic(market.topic)}` : undefined}
        >
          <span
            className={cn(
              'h-1 w-1 shrink-0 rounded-full',
              topicFollowed ? 'bg-primary' : 'bg-muted-foreground/60',
            )}
          />
          <span className="truncate">{formatTopic(market.topic)}</span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setAnalystOpen(true)}
            aria-label="Open market briefing"
            title="Market briefing — the read on this market"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-primary"
          >
            <Newspaper className="h-4 w-4" />
          </button>
          {canFollow && (
            <button
              type="button"
              onClick={() => toggle('market', market.marketId, market.question, market.image)}
              aria-pressed={followed}
              aria-label={followed ? 'Unfollow market' : 'Follow market'}
              className={cn(
                'rounded-full p-1.5 transition-colors',
                followed ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400',
              )}
            >
              <Star className={cn('h-4 w-4', followed && 'fill-current')} />
            </button>
          )}
        </div>
      </div>

      {/* Question */}
      <a
        href={`${POLYMARKET_BASE}${market.slug}`}
        target="_blank"
        rel="noreferrer"
        className="text-[1.05rem] font-semibold leading-[1.3] tracking-[-0.01em] text-foreground transition-colors hover:text-primary"
      >
        {market.question}
      </a>

      {/* Odds + delta */}
      <div className="mt-5 flex items-end justify-between">
        <div>
          <div className="text-[2.5rem] font-semibold leading-none tabular-nums tracking-[-0.02em] text-foreground">
            {formatPct(market.yesPrice)}
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">
            chance of {market.outcomes[0] ?? 'Yes'}
          </div>
        </div>
        <DeltaBadge label={deltaLabel} up={up} down={down} source={market.deltaSource} />
      </div>

      {/* Probability bar */}
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted">
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

      {analystOpen && (
        <AnalystModal market={market} canGenerate={canFollow} onClose={() => setAnalystOpen(false)} />
      )}
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
