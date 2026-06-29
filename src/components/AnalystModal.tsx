import { useEffect, useRef, useState } from 'react'
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Zap,
  ExternalLink,
  Sparkles,
  ShieldAlert,
  Radio,
} from 'lucide-react'
import { Modal, Button, Skeleton } from './ui'
import { useAnalysis } from '../lib/useAnalysis'
import { useCalls } from '../lib/useCalls'
import type { BriefMarket, MarketAnalysis } from '../types'
import { formatPct } from '../lib/format'
import { cn } from './ui/utils'

type Source = MarketAnalysis['sources'][number]

/** "2h ago" / "3d ago" / "Mar 4" for an ISO date. */
function timeAgo(iso?: string): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  const mins = Math.round((Date.now() - t) / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AnalystModal({
  market,
  canGenerate,
  onClose,
}: {
  market: BriefMarket
  canGenerate: boolean
  onClose: () => void
}) {
  const { analysis, isFresh, generating, error, generate } = useAnalysis(market)
  const { byMarket } = useCalls()
  const myCall = byMarket.get(market.marketId)?.data ?? null

  // Auto-generate once on open if signed in and there's no fresh analysis.
  // A ref guard prevents an error from triggering an infinite retry loop.
  const triedAuto = useRef(false)
  useEffect(() => {
    if (triedAuto.current) return
    if (canGenerate && !isFresh && !analysis) {
      triedAuto.current = true
      void generate()
    }
  }, [canGenerate, isFresh, analysis, generate])

  const storyCount = analysis?.sources.length ?? 0

  return (
    <Modal open onClose={onClose} size="xl">
      <Modal.Header>
        <Modal.Title>
          <div className="flex items-center gap-2.5">
            <Newspaper className="h-5 w-5 text-primary" aria-hidden />
            <span className="font-serif text-xl font-semibold">Market briefing</span>
            {storyCount > 0 && (
              <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <Radio className="h-3 w-3" aria-hidden />
                {storyCount} stories
              </span>
            )}
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-[1.05rem] font-medium leading-snug text-foreground">{market.question}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {market.outcomes[0] ?? 'Yes'} trades at {formatPct(market.yesPrice)} · we read the latest
          coverage so you don&apos;t have to — not advice
        </p>

        {generating && !analysis ? (
          <LoadingState />
        ) : error && !analysis ? (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm text-destructive">
            {error}
            {canGenerate && (
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={generate} loading={generating}>
                  Try again
                </Button>
              </div>
            )}
          </div>
        ) : !analysis ? (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-card/40 px-4 py-10 text-center text-sm text-muted-foreground">
            {canGenerate ? (
              <Button onClick={generate} loading={generating}>
                <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                Pull the coverage
              </Button>
            ) : (
              'Sign in to pull the latest coverage on this market.'
            )}
          </div>
        ) : (
          <AnalysisBody analysis={analysis} myProb={myCall?.predictedProb ?? null} market={market} />
        )}
      </Modal.Body>
      <Modal.Footer>
        {analysis && canGenerate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={generate}
            loading={generating}
            disabled={isFresh && generating}
          >
            Refresh coverage
          </Button>
        )}
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

function LoadingState() {
  return (
    <div className="mt-6 space-y-5">
      <div className="flex items-center gap-2 text-sm text-primary">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        Scanning recent coverage and writing your briefing…
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="space-y-2.5 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 rounded-xl border border-border p-3">
            <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnalysisBody({
  analysis,
  myProb,
  market,
}: {
  analysis: MarketAnalysis
  myProb: number | null
  market: BriefMarket
}) {
  const primary = market.outcomes[0] ?? 'Yes'
  const secondary = market.outcomes[1] ?? 'No'
  let counter: { side: string; text: string } | null = null
  if (myProb != null) {
    if (myProb > 0.55) counter = { side: secondary, text: analysis.bearCase }
    else if (myProb < 0.45) counter = { side: primary, text: analysis.bullCase }
  }

  return (
    <div className="mt-6 space-y-6">
      {/* The lede */}
      <p className="border-l-2 border-primary/50 pl-4 text-[1.05rem] leading-relaxed text-foreground">
        {analysis.summary}
      </p>

      {/* The coverage — the marquee. */}
      {analysis.sources.length > 0 && <CoverageFeed sources={analysis.sources} />}

      {/* If the reader has a call, the strongest counter to their lean. */}
      {counter && (
        <div className="rounded-xl border border-primary/25 bg-primary/[0.07] px-4 py-3.5">
          <div className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-primary">
            <ShieldAlert className="h-4 w-4" aria-hidden />
            The other side
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">
            You&apos;re leaning {myProb! > 0.5 ? primary : secondary} ({formatPct(myProb!)}). The
            strongest case the other way: {counter.text}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <CasePanel
          tone="for"
          icon={<TrendingUp className="h-4 w-4" />}
          title={`The case for ${primary}`}
          text={analysis.bullCase}
        />
        <CasePanel
          tone="against"
          icon={<TrendingDown className="h-4 w-4" />}
          title={`The case for ${secondary}`}
          text={analysis.bearCase}
        />
      </div>

      <div className="rounded-xl border border-border bg-card/60 px-4 py-3.5">
        <div className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-primary">
          <Zap className="h-4 w-4" aria-hidden />
          What to watch
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground">{analysis.whatCouldMove}</p>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Briefing written {new Date(analysis.generatedAt).toLocaleString()} — every claim drawn from
        the coverage above.
      </p>
    </div>
  )
}

function CoverageFeed({ sources }: { sources: Source[] }) {
  const freshest = sources
    .map((s) => (s.publishedAt ? Date.parse(s.publishedAt) : NaN))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a)[0]

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="font-serif text-base font-semibold tracking-tight">In the news</h3>
        </div>
        {Number.isFinite(freshest) && (
          <span className="text-[11px] text-muted-foreground">
            freshest {timeAgo(new Date(freshest).toISOString())}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {sources.map((s, i) => (
          <StoryRow key={i} source={s} />
        ))}
      </div>
    </section>
  )
}

function StoryRow({ source }: { source: Source }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="group flex gap-3.5 rounded-xl border border-border bg-card/40 p-3 transition-colors hover:border-primary/30 hover:bg-card"
    >
      <StoryThumb source={source} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-semibold uppercase tracking-wide text-primary">{source.source}</span>
          {source.publishedAt && (
            <>
              <span aria-hidden>·</span>
              <span>{timeAgo(source.publishedAt)}</span>
            </>
          )}
        </div>
        <div className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary">
          {source.title}
        </div>
        {source.description && (
          <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {source.description}
          </div>
        )}
      </div>
      <ExternalLink
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary"
        aria-hidden
      />
    </a>
  )
}

function StoryThumb({ source }: { source: Source }) {
  const [broken, setBroken] = useState(false)
  if (source.image && !broken) {
    return (
      <img
        src={source.image}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-inset ring-border"
      />
    )
  }
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-base font-serif font-semibold text-muted-foreground ring-1 ring-inset ring-border">
      {source.source.slice(0, 1).toUpperCase()}
    </div>
  )
}

function CasePanel({
  tone,
  icon,
  title,
  text,
}: {
  tone: 'for' | 'against'
  icon: React.ReactNode
  title: string
  text: string
}) {
  const accent = tone === 'for' ? 'text-emerald-400' : 'text-rose-400'
  return (
    <div className="rounded-xl border border-border bg-card/60 px-4 py-3.5">
      <div className={cn('flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.08em]', accent)}>
        {icon}
        {title}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground">{text}</p>
    </div>
  )
}
