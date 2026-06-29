/**
 * scoring — the forecasting loop's math + resolution detection.
 *
 * `computeStats` is a pure function shared by the client (scorecard) and any
 * server use. `resolveOpenCalls` runs server-side (cron + action) to detect
 * resolved markets and score the user's open calls.
 */

import type { Call, ForecasterStats } from './types'

/** Brier score for a single forecast: (p − outcome)². Lower is better. */
export function brier(predictedProb: number, outcome: number): number {
  return (predictedProb - outcome) ** 2
}

/** Map a mean Brier (0 best … 0.25 coin-flip) to a friendly 0..100 skill score. */
export function brierToSkill(meanBrier: number): number {
  // 0 → 100, 0.25 → 50, 1.0 → 0. Linear in Brier, clamped.
  const skill = 100 - meanBrier * 200
  return Math.max(0, Math.min(100, Math.round(skill)))
}

/** Did the user's lean match reality? (predicted > 0.5 means "Yes".) */
export function isCorrect(predictedProb: number, outcome: number): boolean {
  if (predictedProb === 0.5) return false // no lean → not counted as correct
  return predictedProb > 0.5 === (outcome === 1)
}

/** Compute aggregate forecaster stats from a user's calls. Pure. */
export function computeStats(calls: Call[]): ForecasterStats {
  const open = calls.filter((c) => c.status === 'open')
  const resolved = calls.filter(
    (c) => c.status === 'resolved' && c.resolvedOutcome != null && c.brier != null,
  )

  const n = resolved.length
  const correct = resolved.filter((c) => isCorrect(c.predictedProb, c.resolvedOutcome!)).length
  const meanBrier = n === 0 ? 0 : resolved.reduce((s, c) => s + (c.brier ?? 0), 0) / n
  const marketMeanBrier =
    n === 0 ? 0 : resolved.reduce((s, c) => s + (c.marketBrier ?? 0), 0) / n
  const beat = resolved.filter((c) => c.beatMarket === true).length

  // Calibration: 10 buckets of predicted probability.
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    bucket: i,
    sumPredicted: 0,
    sumRealized: 0,
    count: 0,
  }))
  for (const c of resolved) {
    const idx = Math.min(9, Math.floor(c.predictedProb * 10))
    buckets[idx].sumPredicted += c.predictedProb
    buckets[idx].sumRealized += c.resolvedOutcome!
    buckets[idx].count += 1
  }
  const calibration = buckets
    .filter((b) => b.count > 0)
    .map((b) => ({
      bucket: b.bucket,
      predicted: b.sumPredicted / b.count,
      realized: b.sumRealized / b.count,
      count: b.count,
    }))

  // Per-category breakdown.
  const byTopic = new Map<string, Call[]>()
  for (const c of resolved) {
    const key = c.topic || 'other'
    const arr = byTopic.get(key) ?? []
    arr.push(c)
    byTopic.set(key, arr)
  }
  const byCategory = [...byTopic.entries()]
    .map(([topic, arr]) => ({
      topic,
      resolved: arr.length,
      accuracy:
        arr.length === 0
          ? 0
          : arr.filter((c) => isCorrect(c.predictedProb, c.resolvedOutcome!)).length / arr.length,
      meanBrier: arr.reduce((s, c) => s + (c.brier ?? 0), 0) / arr.length,
    }))
    .sort((a, b) => b.resolved - a.resolved)

  return {
    total: calls.length,
    open: open.length,
    resolved: n,
    accuracy: n === 0 ? 0 : correct / n,
    meanBrier,
    skillScore: brierToSkill(meanBrier),
    beatMarketRate: n === 0 ? 0 : beat / n,
    marketMeanBrier,
    calibration,
    byCategory,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Server-side resolution
// ─────────────────────────────────────────────────────────────────────────────

interface ResolveCtx {
  records: {
    query: (collection: string, opts?: { where?: Record<string, unknown>; limit?: number }) => Promise<
      { recordId: string; data: Record<string, unknown> }[]
    >
    update: (collection: string, recordId: string, data: Record<string, unknown>) => Promise<unknown>
    create: (collection: string, data: Record<string, unknown>) => Promise<unknown>
  }
  integrations: { call: <T = unknown>(endpoint: string, params?: Record<string, unknown>) => Promise<T> }
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []
  try {
    const p = JSON.parse(value)
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

/** A market's resolution, if it has resolved. */
interface Resolution {
  resolved: boolean
  /** Realized value of the primary outcome (1 = "Yes" won, 0 = "No" won). */
  outcome: number
}

async function fetchResolution(ctx: ResolveCtx, marketId: string): Promise<Resolution> {
  try {
    const m = await ctx.integrations.call<Record<string, unknown>>('polymarket/market-detail', {
      id: marketId,
    })
    const closed = m?.closed === true
    const status = String(m?.umaResolutionStatus ?? '')
    if (!closed || status !== 'resolved') return { resolved: false, outcome: 0 }
    const prices = parseJsonArray(m?.outcomePrices).map((v) =>
      typeof v === 'string' ? parseFloat(v) : (v as number),
    )
    // Resolved markets collapse to ["1","0"] / ["0","1"]. Round to be safe.
    const outcome = Math.round(prices[0] ?? 0) === 1 ? 1 : 0
    return { resolved: true, outcome }
  } catch {
    return { resolved: false, outcome: 0 }
  }
}

/**
 * Resolve and score every open call whose market has resolved.
 * Returns the number of calls newly resolved.
 */
export async function resolveOpenCalls(ctx: ResolveCtx): Promise<number> {
  const openRows = await ctx.records.query('calls', { where: { status: 'open' }, limit: 1000 })
  if (openRows.length === 0) return 0

  // Look up each distinct market once.
  const marketIds = [...new Set(openRows.map((r) => String(r.data.marketId)))]
  const resolutions = new Map<string, Resolution>()
  for (const id of marketIds) {
    resolutions.set(id, await fetchResolution(ctx, id))
  }

  const now = Date.now()
  let resolvedCount = 0
  for (const row of openRows) {
    const data = row.data as unknown as Call
    const res = resolutions.get(String(data.marketId))
    if (!res || !res.resolved) continue

    const b = brier(data.predictedProb, res.outcome)
    const mb = brier(data.marketProbAtCall, res.outcome)
    const beat = b < mb
    await ctx.records.update('calls', row.recordId, {
      status: 'resolved',
      resolvedOutcome: res.outcome,
      resolvedAt: now,
      brier: b,
      marketBrier: mb,
      beatMarket: beat,
    })
    resolvedCount++

    // Resolution recap notification for the forecaster.
    try {
      const primary = data.outcomes?.[0] ?? 'Yes'
      const secondary = data.outcomes?.[1] ?? 'No'
      const won = res.outcome === 1 ? primary : secondary
      const correct = data.predictedProb !== 0.5 && data.predictedProb > 0.5 === (res.outcome === 1)
      await ctx.records.create('notifications', {
        userId: data.userId,
        type: 'resolution',
        title: correct ? 'You called it' : 'A call resolved',
        body:
          `You said ${Math.round(data.predictedProb * 100)}% ${primary} on “${data.question}”. ` +
          `It resolved ${won} — ${beat ? 'you beat the market.' : 'the market edged you out.'}`,
        marketId: data.marketId,
        slug: data.slug ?? '',
        read: false,
        createdAtMs: now,
      })
    } catch {
      // A missing recap shouldn't block scoring.
    }
  }
  return resolvedCount
}
