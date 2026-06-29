/**
 * /u/:userId — a public, read-only forecaster profile. Outside the (protected)
 * group, so anyone with the link can view a published profile.
 */

import { useParams, Link } from 'react-router-dom'
import { Trophy, Crosshair, Target, TrendingUp, ArrowRight, UserX } from 'lucide-react'
import { Button, EmptyState, LoadingOverlay } from '../../components/ui'
import { usePublicProfile } from '../../lib/useProfile'
import { formatTopic } from '../../lib/format'
import type { ForecasterProfile } from '../../types'
import { cn } from '../../components/ui/utils'

export default function PublicProfilePage() {
  const { userId = '' } = useParams()
  const { profile, loading } = usePublicProfile(userId)

  if (loading) return <LoadingOverlay />

  if (!profile) {
    return (
      <div className="min-h-full bg-background text-foreground">
        <div className="mx-auto max-w-2xl px-6 py-20">
          <EmptyState
            icon={<UserX className="h-6 w-6" />}
            title="Profile not available"
            description="This forecaster hasn't made their profile public — or it doesn't exist."
            action={{ label: 'Explore Bellwether', onClick: () => (window.location.href = '/home') }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]"
        />
        <div className="relative mx-auto max-w-3xl px-6 pb-10 pt-16 text-center">
          <div className="text-xs font-medium uppercase tracking-wide text-primary">
            Bellwether forecaster
          </div>
          <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight">{profile.name}</h1>
          <div className="mt-6 inline-flex items-baseline gap-2">
            <span className="text-6xl font-bold tabular-nums tracking-tight">
              {Math.round(profile.accuracy * 100)}%
            </span>
            <span className="text-lg text-muted-foreground">forecaster</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            across {profile.resolved} resolved call{profile.resolved === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat icon={<Crosshair className="h-4 w-4" />} label="Skill score" value={`${profile.skillScore}`} hint="Brier-based, 0–100" />
          <Stat
            icon={<Trophy className="h-4 w-4" />}
            label="Beat the market"
            value={`${Math.round(profile.beatMarketRate * 100)}%`}
            hint="vs implied odds"
          />
          <Stat icon={<Target className="h-4 w-4" />} label="Resolved calls" value={`${profile.resolved}`} hint="scored vs reality" />
        </div>

        {profile.topCategories.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight">Sharpest categories</h2>
            </div>
            <div className="space-y-3">
              {profile.topCategories.map((c) => (
                <div key={c.topic}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{formatTopic(c.topic)}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {Math.round(c.accuracy * 100)}% · {c.resolved}
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
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-6 text-center">
          <h3 className="text-lg font-semibold tracking-tight">Think you can forecast better?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Bellwether scores your prediction-market calls against reality — and against the market.
          </p>
          <Link to="/home" className="mt-4 inline-block">
            <Button>
              Start forecasting
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Stats last updated {new Date(profile.updatedAtMs).toLocaleDateString()}.
        </p>
      </div>
    </div>
  )
}

function Stat({
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
    <div className="rounded-2xl border border-border bg-card p-5 text-center">
      <div className="flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold tabular-nums tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
    </div>
  )
}
