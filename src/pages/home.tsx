import { useMemo, useState } from 'react'
import { TrendingUp, Flame, Hourglass, RefreshCw, Star, Bell } from 'lucide-react'
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
import { useLatestBrief, useFollows, triggerBuildBrief } from '../lib/useBrief'
import { formatBriefDate } from '../lib/format'
import type { BriefMarket } from '../types'

export default function HomePage() {
  const { isSignedIn } = useAuth()
  const { brief, loading } = useLatestBrief()
  const { follows, isFollowing } = useFollows()
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

          <div className="flex items-center gap-2">
            <Link
              to="/digest"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-md transition-colors hover:bg-card"
            >
              <Bell className="h-4 w-4" aria-hidden />
              Email digest
            </Link>
            {canRefresh && (
              <Button variant="outline" loading={refreshing} onClick={onRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                Refresh
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
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
