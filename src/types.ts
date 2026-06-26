/**
 * Shared types for Bellwether — a daily prediction-market brief.
 *
 * These shapes are written by the worker (cron + buildBrief action) and read
 * by the client. Kept type-only so both sides import the same contract.
 */

/** A single market as it appears in a daily snapshot (for odds diffing). */
export interface SnapshotMarket {
  id: string
  question: string
  slug: string
  /** Implied probability of the primary ("Yes") outcome, 0..1. */
  yesPrice: number
  outcomes: string[]
  outcomePrices: number[]
  volume24hr: number
  volume: number
  liquidity: number
  endDate: string | null
  topic: string
  eventTitle: string
  image: string
  clobTokenId: string | null
}

/** One day's odds snapshot, keyed by date (recordId = `YYYY-MM-DD`). */
export interface Snapshot {
  date: string
  capturedAt: number
  markets: SnapshotMarket[]
}

/** A market as featured in the brief — snapshot data plus delta + AI blurb. */
export interface BriefMarket {
  marketId: string
  question: string
  slug: string
  yesPrice: number
  prevYesPrice: number | null
  /** yesPrice - prevYesPrice (signed), in probability points 0..1. Null if unknown. */
  delta: number | null
  outcomes: string[]
  outcomePrices: number[]
  volume24hr: number
  volume: number
  liquidity: number
  endDate: string | null
  topic: string
  eventTitle: string
  image: string
  blurb: string
  /** How the delta was derived. */
  deltaSource: 'snapshot' | 'history' | 'none'
}

/** The full daily brief, keyed by date (recordId = `YYYY-MM-DD`). */
export interface Brief {
  date: string
  generatedAt: number
  marketCount: number
  topMovers: BriefMarket[]
  trending: BriefMarket[]
  closingSoon: BriefMarket[]
}

/** A market or topic a user follows. */
export interface Follow {
  userId: string
  targetType: 'market' | 'topic'
  targetId: string
  label: string
  image: string
}

/** Per-user digest preferences. */
export interface Preference {
  userId: string
  emailEnabled: boolean
  email: string
}
