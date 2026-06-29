/**
 * /edition — the daily editorial "morning read". A single, readable piece that
 * threads the top markets and their coverage together. Public.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, ArrowUpRight, Newspaper, ArrowRight } from 'lucide-react'
import { Button, EmptyState, Skeleton } from '../components/ui'
import { useLatestEdition } from '../lib/useEdition'
import { formatBriefDate, formatPct, formatTopic } from '../lib/format'
import type { Edition, EditionStory } from '../types'
import { cn } from '../components/ui/utils'

const POLYMARKET_BASE = 'https://polymarket.com/market/'

export default function EditionPage() {
  const { edition, loading } = useLatestEdition()

  if (loading) return <EditionSkeleton />

  if (!edition) {
    return (
      <div className="min-h-full bg-background text-foreground">
        <div className="mx-auto max-w-2xl px-6 py-20">
          <EmptyState
            icon={<Newspaper className="h-6 w-6" />}
            title="No edition yet"
            description="The morning edition is written each day alongside the brief. Check back shortly."
            action={{ label: 'Browse the brief', onClick: () => (window.location.href = '/home') }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <article className="mx-auto max-w-2xl px-6 py-14">
        <Masthead edition={edition} />

        {/* Lede */}
        <p className="mt-8 border-l-2 border-primary/50 pl-5 text-[1.15rem] leading-relaxed text-foreground">
          {edition.intro}
        </p>

        {/* Stories */}
        <div className="mt-12 space-y-12">
          {edition.stories.map((s, i) => (
            <Story key={s.marketId} story={s} index={i} />
          ))}
        </div>

        {/* Signoff */}
        <p className="mt-12 border-t border-border pt-8 font-serif text-lg italic text-foreground">
          {edition.signoff}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/daily">
            <Button>
              Make today&apos;s calls
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Button>
          </Link>
          <Link to="/home">
            <Button variant="outline">Open the full brief</Button>
          </Link>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Odds from Polymarket; coverage via the day&apos;s reporting. Informational only — not
          financial advice.
        </p>
      </article>
    </div>
  )
}

function Masthead({ edition }: { edition: Edition }) {
  return (
    <header className="border-b border-border pb-8">
      <div className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary/40 blur-[2px]" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        The Edition
        <span className="text-muted-foreground">· {formatBriefDate(edition.date)}</span>
      </div>
      <h1 className="mt-4 font-serif text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.02em]">
        {edition.headline}
      </h1>
      <p className="mt-3 text-lg italic text-muted-foreground">{edition.dek}</p>
      <p className="mt-4 text-xs text-muted-foreground">
        {edition.marketCount} markets scanned · {edition.stories.length} stories
      </p>
    </header>
  )
}

function Story({ story, index }: { story: EditionStory; index: number }) {
  const delta = story.delta
  const up = delta != null && delta > 0.0005
  const down = delta != null && delta < -0.0005
  const Icon = up ? TrendingUp : down ? TrendingDown : null

  return (
    <section>
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-2xl font-semibold text-primary">{index + 1}</span>
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {formatTopic(story.topic)}
        </span>
      </div>

      <a
        href={`${POLYMARKET_BASE}${story.slug}`}
        target="_blank"
        rel="noreferrer"
        className="group mt-1.5 block"
      >
        <h2 className="font-serif text-[1.6rem] font-semibold leading-tight tracking-[-0.01em] text-foreground transition-colors group-hover:text-primary">
          {story.question}
        </h2>
      </a>

      {/* Odds line */}
      <div className="mt-2 flex items-center gap-3 text-sm">
        <span className="font-medium text-foreground">
          {story.outcomes[0] ?? 'Yes'} {formatPct(story.yesPrice)}
        </span>
        {Icon && delta != null && (
          <span
            className={cn(
              'inline-flex items-center gap-1 font-semibold tabular-nums',
              up ? 'text-emerald-400' : 'text-rose-400',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {up ? '+' : '−'}
            {Math.abs(delta * 100).toFixed(1)} pts overnight
          </span>
        )}
      </div>

      <StoryImage story={story} />

      <p className="mt-4 text-[1.05rem] leading-relaxed text-foreground/90">{story.take}</p>

      {story.sources.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-wide text-muted-foreground">
            In the news
          </span>
          {story.sources.slice(0, 3).map((src, i) => (
            <a
              key={i}
              href={src.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card/50 px-2.5 py-1 text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <span className="font-medium">{src.source}</span>
              <ArrowUpRight className="h-3 w-3 opacity-60" aria-hidden />
            </a>
          ))}
        </div>
      )}
    </section>
  )
}

function StoryImage({ story }: { story: EditionStory }) {
  const [broken, setBroken] = useState(false)
  if (!story.image || broken) return null
  return (
    <img
      src={story.image}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="mt-4 aspect-[16/8] w-full rounded-xl object-cover ring-1 ring-inset ring-border"
    />
  )
}

function EditionSkeleton() {
  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-4 h-12 w-3/4" />
        <Skeleton className="mt-3 h-5 w-1/2" />
        <Skeleton className="mt-8 h-24 w-full" />
        <div className="mt-12 space-y-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
