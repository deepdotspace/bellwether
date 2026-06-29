import { useMemo, useState } from 'react'
import {
  TrendingUp,
  Flame,
  Hourglass,
  RefreshCw,
  Star,
  ArrowRight,
  Target,
  Coffee,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from 'deepspace'
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  EmptyState,
  SkeletonCard,
  useToast,
} from '../components/ui'
import MarketCard from '../components/MarketCard'
import {
  useLatestBrief,
  useFollows,
  triggerBuildBrief,
  selectDailyFive,
} from '../lib/useBrief'
import { useCalls } from '../lib/useCalls'
import { useStreak } from '../lib/useStreak'
import { useLatestEdition } from '../lib/useEdition'
import { formatBriefDate } from '../lib/format'
import { cn } from '../components/ui/utils'
import type { Brief, BriefMarket } from '../types'

export default function HomePage() {
  const { isSignedIn } = useAuth()
  const { brief, loading } = useLatestBrief()
  const { follows, isFollowing } = useFollows()
  const { byMarket } = useCalls()
  const { streak, active } = useStreak()
  const { edition } = useLatestEdition()
  const { success, error: toastError, info } = useToast()
  const [refreshing, setRefreshing] = useState(false)

  const allMarkets = useMemo<BriefMarket[]>(() => {
    if (!brief) return []
    const seen = new Map<string, BriefMarket>()
    for (const m of [...brief.topMovers, ...brief.trending, ...brief.closingSoon]) {
      if (!seen.has(m.marketId)) seen.set(m.marketId, m)
    }
    return [...seen.values()]
  }, [brief])

  const followedMarkets = useMemo(
    () =>
      allMarkets.filter(
        (m) =>
          isFollowing('market', m.marketId) ||
          (m.topic && isFollowing('topic', m.topic)),
      ),
    [allMarkets, isFollowing],
  )

  async function handleRefresh() {
    setRefreshing(true)
    info('Building brief…', 'Pulling fresh odds and writing blurbs.')
    try {
      const res = await triggerBuildBrief()
      if (res.success) {
        success('Brief updated', "Today's brief has been refreshed.")
      } else {
        toastError('Could not build brief', res.error ?? 'Unknown error')
      }
    } catch (e) {
      toastError('Could not build brief', e instanceof Error ? e.message : 'Request failed')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="relative min-h-full bg-background text-foreground">
      <Header
        date={brief?.date}
        marketCount={brief?.marketCount}
        canRefresh={isSignedIn}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <div className="mx-auto max-w-6xl px-6 pb-24">
        {loading ? (
          <SectionSkeleton />
        ) : !brief ? (
          <NoBrief canRefresh={isSignedIn} refreshing={refreshing} onRefresh={handleRefresh} />
        ) : (
          <Tabs defaultValue="all" className="mt-8">
            {edition && (
              <Link
                to="/edition"
                className="group mb-6 flex items-center gap-4 rounded-2xl border border-border bg-gradient-to-r from-card via-card to-background px-5 py-4 transition-colors hover:border-primary/40"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-inset ring-primary/25">
                  <Coffee className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary">
                    Today&apos;s Edition
                  </div>
                  <div className="truncate font-serif text-[1.05rem] font-semibold text-foreground">
                    {edition.headline}
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
                  Read
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            )}
            {isSignedIn && (
              <DailyBanner
                brief={brief}
                doneCount={selectDailyFive(brief).filter((m) => byMarket.has(m.marketId)).length}
                streak={streak?.currentStreak ?? 0}
                streakActive={active}
              />
            )}
            <TabsList>
              <TabsTrigger value="all">Today&apos;s brief</TabsTrigger>
              <TabsTrigger value="following">
                Following{follows.length > 0 ? ` (${follows.length})` : ''}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6 space-y-12">
              <BriefSection
                icon={<TrendingUp className="h-4 w-4" />}
                title="Top movers"
                subtitle="Biggest overnight odds swings"
                markets={brief.topMovers}
                emptyHint="No notable overnight moves yet — check back after the next snapshot."
              />
              <BriefSection
                icon={<Flame className="h-4 w-4" />}
                title="Trending"
                subtitle="Where the volume is going today"
                markets={brief.trending}
              />
              <BriefSection
                icon={<Hourglass className="h-4 w-4" />}
                title="Closing soon"
                subtitle="Markets resolving in the next two weeks"
                markets={brief.closingSoon}
                emptyHint="Nothing major closing in the next two weeks."
              />
            </TabsContent>

            <TabsContent value="following" className="mt-6">
              {!isSignedIn ? (
                <EmptyState
                  icon={<Star className="h-6 w-6" />}
                  title="Sign in to follow markets"
                  description="Star markets and topics to build a personalized brief."
                />
              ) : followedMarkets.length === 0 ? (
                <EmptyState
                  icon={<Star className="h-6 w-6" />}
                  title="Nothing followed yet"
                  description="Tap the star on any market — or its topic chip — to track it here."
                />
              ) : (
                <BriefSection
                  icon={<Star className="h-4 w-4" />}
                  title="Your watchlist"
                  subtitle="Followed markets in today's brief"
                  markets={followedMarkets}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}

function Header({
  date,
  marketCount,
  canRefresh,
  refreshing,
  onRefresh,
}: {
  date?: string
  marketCount?: number
  canRefresh: boolean
  refreshing: boolean
  onRefresh: () => void
}) {
  return (
    <div className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]"
      />
      <div className="relative mx-auto max-w-6xl px-6 pb-10 pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">
              Bellwether
            </h1>
            <p className="mt-2 max-w-xl text-pretty text-base text-muted-foreground">
              What the smart money thinks — a calm daily brief built on prediction
              markets.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {date && <span className="font-medium text-foreground">{formatBriefDate(date)}</span>}
              {typeof marketCount === 'number' && (
                <>
                  <span aria-hidden>·</span>
                  <span>{marketCount} markets scanned</span>
                </>
              )}
            </div>
          </div>

          {canRefresh && (
            <Button variant="outline" loading={refreshing} onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              Refresh
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function DailyBanner({
  brief,
  doneCount,
  streak,
  streakActive,
}: {
  brief: Brief
  doneCount: number
  streak: number
  streakActive: boolean
}) {
  const total = selectDailyFive(brief).length
  if (total === 0) return null
  const complete = doneCount === total
  return (
    <Link
      to="/daily"
      className="group mb-6 flex items-center gap-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-card to-card px-5 py-4 transition-colors hover:border-primary/50"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary ring-1 ring-inset ring-primary/30">
        <Target className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          The Daily Five
          {streak > 0 && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                streakActive ? 'bg-amber-500/15 text-amber-400' : 'bg-muted text-muted-foreground',
              )}
            >
              <Flame className="h-3 w-3" aria-hidden />
              {streak}-day streak
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {complete
            ? "You've forecasted all five today. Nice."
            : `${doneCount} of ${total} forecasted today — keep your streak alive.`}
        </div>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
        {complete ? 'Review' : 'Forecast'}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  )
}

function BriefSection({
  icon,
  title,
  subtitle,
  markets,
  emptyHint,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  markets: BriefMarket[]
  emptyHint?: string
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-inset ring-primary/20">
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {markets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-6 text-sm text-muted-foreground">
          {emptyHint ?? 'Nothing here right now.'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((m) => (
            <MarketCard key={`${title}-${m.marketId}`} market={m} />
          ))}
        </div>
      )}
    </section>
  )
}

function NoBrief({
  canRefresh,
  refreshing,
  onRefresh,
}: {
  canRefresh: boolean
  refreshing: boolean
  onRefresh: () => void
}) {
  return (
    <div className="mt-16">
      <EmptyState
        icon={<TrendingUp className="h-6 w-6" />}
        title="No brief published yet"
        description={
          canRefresh
            ? 'Generate the first brief — it pulls live odds from Polymarket and writes a short read on each market.'
            : 'The daily brief is built each morning. Check back shortly.'
        }
        action={
          canRefresh
            ? { label: refreshing ? 'Building…' : "Generate today's brief", onClick: onRefresh }
            : undefined
        }
      />
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
