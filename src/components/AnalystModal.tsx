import { useEffect, useRef } from 'react'
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Zap,
  ExternalLink,
  Sparkles,
  ShieldAlert,
} from 'lucide-react'
import { Modal, Button, LoadingSpinner } from './ui'
import { useAnalysis } from '../lib/useAnalysis'
import { useCalls } from '../lib/useCalls'
import type { BriefMarket, MarketAnalysis } from '../types'
import { formatPct } from '../lib/format'
import { cn } from './ui/utils'

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

  return (
    <Modal open onClose={onClose} size="lg">
      <Modal.Header>
        <Modal.Title>
          <span className="inline-flex items-center gap-2.5">
            <Newspaper className="h-5 w-5 text-primary" aria-hidden />
            <span className="font-serif text-xl font-semibold">Market briefing</span>
          </span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-[0.95rem] font-medium leading-snug text-foreground">{market.question}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {market.outcomes[0] ?? 'Yes'} trades at {formatPct(market.yesPrice)} · drawn from recent
          reporting, not advice
        </p>

        {generating && !analysis ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
            <LoadingSpinner />
            Reading the latest reporting and writing the briefing…
          </div>
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
          <div className="mt-6 rounded-xl border border-dashed border-border bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
            {canGenerate ? (
              <Button onClick={generate} loading={generating}>
                <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                Write the briefing
              </Button>
            ) : (
              'Sign in to generate a briefing for this market.'
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
            Regenerate
          </Button>
        )}
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
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
  // If the reader has a call, surface the strongest counter to their lean.
  const primary = market.outcomes[0] ?? 'Yes'
  const secondary = market.outcomes[1] ?? 'No'
  let counter: { side: string; text: string } | null = null
  if (myProb != null) {
    if (myProb > 0.55) counter = { side: secondary, text: analysis.bearCase }
    else if (myProb < 0.45) counter = { side: primary, text: analysis.bullCase }
  }

  return (
    <div className="mt-6 space-y-5">
      <p className="text-[0.95rem] leading-relaxed text-foreground">{analysis.summary}</p>

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

      {analysis.sources.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sources
          </div>
          <ul className="space-y-1.5">
            {analysis.sources.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                    {s.source}
                  </span>
                  <span className="flex-1 group-hover:underline">{s.title}</span>
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Written {new Date(analysis.generatedAt).toLocaleString()} · grounded in the sources above.
      </p>
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
