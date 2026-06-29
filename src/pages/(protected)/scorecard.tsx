/**
 * /scorecard — "how good a forecaster are you?"
 * Brier-based skill, accuracy, beat-the-market rate, a calibration curve,
 * a per-category breakdown, and the user's open + resolved call history.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Target,
  RefreshCw,
  Trophy,
  Crosshair,
  TrendingUp,
  Check,
  X,
  Share2,
  Copy,
} from 'lucide-react'
import { useUser } from 'deepspace'
import {
  Button,
  Card,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  Switch,
  EmptyState,
  useToast,
} from '../../components/ui'
import { useCalls, triggerResolveCalls } from '../../lib/useCalls'
import { useMyProfile } from '../../lib/useProfile'
import { formatPct, formatTopic, formatCloses } from '../../lib/format'
import type { Call, ForecasterStats } from '../../types'
import { cn } from '../../components/ui/utils'

export default function ScorecardPage() {
  const { calls, stats, loading } = useCalls()
  const { success, error: toastError, info } = useToast()
  const [checking, setChecking] = useState(false)

  const openCalls = calls
    .filter((c) => c.data.status === 'open')
    .map((c) => c.data)
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
  const resolvedCalls = calls
    .filter((c) => c.data.status === 'resolved')
    .map((c) => c.data)
    .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0))

  async function handleCheck() {
    setChecking(true)
    info('Checking for results…', 'Looking up which of your markets have resolved.')
    try {
      const res = await triggerResolveCalls()
      if (res.success) {
        const n = res.data?.resolved ?? 0
        success(
          n > 0 ? `${n} call${n === 1 ? '' : 's'} resolved` : 'No new results yet',
          n > 0 ? 'Your scorecard has been updated.' : 'None of your open markets have resolved.',
        )
      } else {
        toastError('Could not check results', res.error ?? 'Unknown error')
      }
    } catch (e) {
      toastError('Could not check results', e instanceof Error ? e.message : 'Request failed')
    } finally {
      setChecking(false)
    }
  }

  if (!loading && calls.length === 0) {
    return (
      <div className="min-h-full bg-background text-foreground">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <EmptyState
            icon={<Target className="h-6 w-6" />}
            title="No calls logged yet"
            description="Head to the brief and log your own probability on a market. When it resolves, we'll score you against reality — and against the market."
            action={{ label: 'Go to the brief', onClick: () => (window.location.href = '/home') }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight">Your scorecard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              How calibrated your forecasts are — scored by Brier against what actually happened.
            </p>
          </div>
          <Button variant="outline" loading={checking} onClick={handleCheck}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            Check for results
          </Button>
        </div>

        <HeadlineStats stats={stats} />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <CalibrationCard stats={stats} />
          <CategoryCard stats={stats} />
        </div>

        <PublishCard stats={stats} />


        <div className="mt-10">
          <Tabs defaultValue="open">
            <TabsList>
              <TabsTrigger value="open">Open calls ({openCalls.length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolvedCalls.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="open" className="mt-4">
              {openCalls.length === 0 ? (
                <EmptyRow text="No open calls. Log one from the brief." />
              ) : (
                <div className="space-y-2">
                  {openCalls.map((c) => (
                    <OpenCallRow key={c.marketId} call={c} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="resolved" className="mt-4">
              {resolvedCalls.length === 0 ? (
                <EmptyRow text="Nothing resolved yet — markets resolve on their own schedule." />
              ) : (
                <div className="space-y-2">
                  {resolvedCalls.map((c) => (
                    <ResolvedCallRow key={c.marketId} call={c} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function HeadlineStats({ stats }: { stats: ForecasterStats }) {
  const hasResolved = stats.resolved > 0
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-primary">
          Forecaster accuracy
        </div>
        <div className="mt-1 text-4xl font-bold tabular-nums tracking-tight">
          {hasResolved ? `${Math.round(stats.accuracy * 100)}%` : '—'}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {hasResolved
            ? `across ${stats.resolved} resolved call${stats.resolved === 1 ? '' : 's'}`
            : 'no calls resolved yet'}
        </div>
      </div>

      <StatTile
        icon={<Crosshair className="h-4 w-4" />}
        label="Skill score"
        value={hasResolved ? `${stats.skillScore}` : '—'}
        hint={hasResolved ? `Brier ${stats.meanBrier.toFixed(3)}` : 'Brier-based, 0–100'}
      />
      <StatTile
        icon={<Trophy className="h-4 w-4" />}
        label="Beat the market"
        value={hasResolved ? `${Math.round(stats.beatMarketRate * 100)}%` : '—'}
        hint={hasResolved ? `mkt Brier ${stats.marketMeanBrier.toFixed(3)}` : 'vs implied odds'}
      />
      <StatTile
        icon={<Target className="h-4 w-4" />}
        label="Calls logged"
        value={`${stats.total}`}
        hint={`${stats.open} open · ${stats.resolved} resolved`}
      />
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-4xl font-bold tabular-nums tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  )
}

function PublishCard({ stats }: { stats: ForecasterStats }) {
  const { user } = useUser()
  const { isPublic, publish } = useMyProfile(stats)
  const { success, error: toastError } = useToast()
  const [busy, setBusy] = useState(false)

  const shareUrl = user?.id ? `${window.location.origin}/u/${user.id}` : ''

  async function toggle(next: boolean) {
    setBusy(true)
    try {
      await publish(next)
      success(
        next ? 'Profile published' : 'Profile hidden',
        next ? 'Anyone with your link can see your forecasting record.' : 'Your profile is private again.',
      )
    } catch (e) {
      toastError('Could not update profile', e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function republish() {
    setBusy(true)
    try {
      await publish(true)
      success('Profile refreshed', 'Your public stats now match your latest scorecard.')
    } catch (e) {
      toastError('Could not refresh', e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  function copyLink() {
    if (!shareUrl) return
    void navigator.clipboard.writeText(shareUrl)
    success('Link copied', shareUrl)
  }

  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-inset ring-primary/20">
              <Share2 className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Public profile</h2>
              <p className="text-xs text-muted-foreground">
                Share a read-only page of your forecasting record — accuracy, skill, and your
                sharpest categories.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {!user?.id ? 'Loading…' : isPublic ? 'Public' : 'Private'}
            </span>
            <Switch
              checked={isPublic}
              disabled={busy || !user?.id}
              onCheckedChange={toggle}
              aria-label="Make profile public"
            />
          </div>
        </div>

        {isPublic && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <code className="flex-1 truncate text-xs text-muted-foreground">{shareUrl}</code>
            <Button size="sm" variant="outline" onClick={copyLink}>
              <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Copy
            </Button>
            <Button size="sm" variant="ghost" loading={busy} onClick={republish}>
              Refresh stats
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CalibrationCard({ stats }: { stats: ForecasterStats }) {
  const enough = stats.resolved >= 5 && stats.calibration.length >= 2
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight">Calibration</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          When you say 70%, does it happen 70% of the time? Points on the dashed line are
          perfectly calibrated.
        </p>
        {enough ? (
          <CalibrationChart stats={stats} />
        ) : (
          <div className="mt-6 flex h-[240px] items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 text-center text-sm text-muted-foreground">
            Resolve at least 5 calls to see your calibration curve
            <br />({stats.resolved}/5 so far).
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CalibrationChart({ stats }: { stats: ForecasterStats }) {
  const size = 240
  const pad = 28
  const span = size - pad * 2
  const x = (p: number) => pad + p * span
  const y = (p: number) => size - pad - p * span
  const maxCount = Math.max(...stats.calibration.map((b) => b.count), 1)

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mt-4 w-full" role="img" aria-label="Calibration curve">
      {/* axes */}
      <line x1={pad} y1={size - pad} x2={size - pad} y2={size - pad} stroke="var(--color-border)" />
      <line x1={pad} y1={pad} x2={pad} y2={size - pad} stroke="var(--color-border)" />
      {/* ideal diagonal */}
      <line
        x1={x(0)}
        y1={y(0)}
        x2={x(1)}
        y2={y(1)}
        stroke="var(--color-muted-foreground)"
        strokeDasharray="4 4"
        opacity={0.6}
      />
      {/* connecting path */}
      <polyline
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={1.5}
        opacity={0.5}
        points={stats.calibration.map((b) => `${x(b.predicted)},${y(b.realized)}`).join(' ')}
      />
      {/* points */}
      {stats.calibration.map((b) => (
        <circle
          key={b.bucket}
          cx={x(b.predicted)}
          cy={y(b.realized)}
          r={3 + (b.count / maxCount) * 5}
          fill="var(--color-primary)"
        />
      ))}
      {/* labels */}
      <text x={x(0)} y={size - pad + 14} fontSize="9" fill="var(--color-muted-foreground)">
        0%
      </text>
      <text x={x(1) - 14} y={size - pad + 14} fontSize="9" fill="var(--color-muted-foreground)">
        100%
      </text>
      <text x={pad - 22} y={y(1) + 4} fontSize="9" fill="var(--color-muted-foreground)">
        100%
      </text>
      <text x={pad - 16} y={y(0)} fontSize="9" fill="var(--color-muted-foreground)">
        0%
      </text>
      <text x={size / 2 - 30} y={size - 4} fontSize="9" fill="var(--color-muted-foreground)">
        your predicted %
      </text>
    </svg>
  )
}

function CategoryCard({ stats }: { stats: ForecasterStats }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight">By category</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Where you&apos;re sharp — and where you&apos;re not. Accuracy on resolved calls per topic.
        </p>
        {stats.byCategory.length === 0 ? (
          <div className="mt-6 flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-card/40 text-sm text-muted-foreground">
            No resolved calls yet.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {stats.byCategory.slice(0, 8).map((c) => (
              <div key={c.topic}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{formatTopic(c.topic)}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {Math.round(c.accuracy * 100)}% · {c.resolved} call{c.resolved === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      c.accuracy >= 0.6 ? 'bg-emerald-500' : c.accuracy >= 0.4 ? 'bg-primary' : 'bg-rose-500',
                    )}
                    style={{ width: `${Math.max(4, c.accuracy * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CallMeta({ call }: { call: Call }) {
  return (
    <div className="min-w-0">
      <Link
        to="/home"
        className="block truncate text-sm font-medium text-foreground hover:text-primary"
        title={call.question}
      >
        {call.question}
      </Link>
      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{formatTopic(call.topic)}</span>
        {call.note && (
          <>
            <span aria-hidden>·</span>
            <span className="truncate italic">“{call.note}”</span>
          </>
        )}
      </div>
    </div>
  )
}

function OpenCallRow({ call }: { call: Call }) {
  const edge = call.predictedProb - call.marketProbAtCall
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
      <CallMeta call={call} />
      <div className="flex shrink-0 items-center gap-4 text-right">
        <div>
          <div className="text-base font-bold tabular-nums">{formatPct(call.predictedProb)}</div>
          <div className="text-[11px] text-muted-foreground">your call</div>
        </div>
        <div>
          <div className="text-base font-medium tabular-nums text-muted-foreground">
            {formatPct(call.marketProbAtCall)}
          </div>
          <div className="text-[11px] text-muted-foreground">mkt @ call</div>
        </div>
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {edge >= 0 ? '+' : '−'}
          {Math.abs(edge * 100).toFixed(0)} edge
        </Badge>
        <span className="hidden text-xs text-muted-foreground md:inline">
          {formatCloses(call.endDate)}
        </span>
      </div>
    </div>
  )
}

function ResolvedCallRow({ call }: { call: Call }) {
  const primary = call.outcomes[0] ?? 'Yes'
  const secondary = call.outcomes[1] ?? 'No'
  const wonYes = call.resolvedOutcome === 1
  const correct =
    call.predictedProb !== 0.5 && call.predictedProb > 0.5 === wonYes
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
            correct ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400',
          )}
          title={correct ? 'You called it' : 'You missed this one'}
        >
          {correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </span>
        <CallMeta call={call} />
      </div>
      <div className="flex shrink-0 items-center gap-4 text-right">
        <div className="hidden text-xs text-muted-foreground sm:block">
          resolved <span className="font-medium text-foreground">{wonYes ? primary : secondary}</span>
        </div>
        <div>
          <div className="text-sm font-bold tabular-nums">{formatPct(call.predictedProb)}</div>
          <div className="text-[11px] text-muted-foreground">you</div>
        </div>
        {call.beatMarket != null && (
          <Badge
            variant={call.beatMarket ? 'default' : 'secondary'}
            className={cn(call.beatMarket && 'bg-emerald-500/15 text-emerald-400')}
          >
            {call.beatMarket ? 'Beat market' : 'Market won'}
          </Badge>
        )}
      </div>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-6 text-sm text-muted-foreground">
      {text}
    </p>
  )
}
