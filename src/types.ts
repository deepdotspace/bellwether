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

/**
 * A user's logged forecast on a market — the heart of the forecasting loop.
 * Market info is denormalized so the call's history renders even after the
 * market leaves the brief. Scoring fields are written server-side on resolution.
 */
export interface Call {
  userId: string
  marketId: string
  /** Denormalized market display info (snapshot at call time). */
  question: string
  slug: string
  image: string
  topic: string
  eventTitle: string
  outcomes: string[]
  endDate: string | null
  /** The user's probability for the primary ("Yes") outcome, 0..1. */
  predictedProb: number
  /** Implied market probability of the primary outcome at the moment of the call. */
  marketProbAtCall: number
  /** Optional one-line thesis / reasoning. */
  note: string
  createdAtMs: number
  status: 'open' | 'resolved'
  /** Realized value of the primary outcome: 1 if "Yes" won, 0 if "No" won. */
  resolvedOutcome: number | null
  resolvedAt: number | null
  /** (predictedProb − resolvedOutcome)² — lower is better. */
  brier: number | null
  /** (marketProbAtCall − resolvedOutcome)² — the market's Brier for comparison. */
  marketBrier: number | null
  /** Did the user's call beat the market's implied odds? */
  beatMarket: boolean | null
}

/** Aggregate forecaster stats computed from a user's resolved calls. */
export interface ForecasterStats {
  total: number
  open: number
  resolved: number
  /** % of resolved calls where the user's lean matched reality. */
  accuracy: number
  /** Mean Brier score across resolved calls (0 = perfect, 0.25 = coin flip). */
  meanBrier: number
  /** Friendly 0..100 skill score derived from Brier. */
  skillScore: number
  /** % of resolved calls where the user beat the market. */
  beatMarketRate: number
  /** Mean Brier of the market on the same calls (for the "vs market" line). */
  marketMeanBrier: number
  /** 10 calibration buckets: predicted band vs realized frequency. */
  calibration: { bucket: number; predicted: number; realized: number; count: number }[]
  /** Per-topic accuracy/Brier breakdown. */
  byCategory: { topic: string; resolved: number; accuracy: number; meanBrier: number }[]
}
