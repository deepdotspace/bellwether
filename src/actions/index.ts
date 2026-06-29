import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { buildDailyBrief, resolveCallsOnly } from '../brief-core'
import { generateAnalysis, type AnalystTools } from '../analyst'
import { etDateKey } from '../lib/date'

/**
 * buildBrief — generate (or refresh) today's brief on demand.
 *
 * Owner-gated: it spends the owner's integration credits (Polymarket +
 * Anthropic + optional email), so only the app owner may trigger it. The daily
 * cron runs the same `buildDailyBrief` automatically; this powers the
 * "Refresh brief" control for the owner.
 */
const buildBrief: ActionHandler<Env> = async ({ env, userId }) => {
  if (env.OWNER_USER_ID && userId !== env.OWNER_USER_ID) {
    return { success: false, error: 'Only the app owner can build the brief.' }
  }
  try {
    const { brief, emailsSent, usedHistoryFallback } = await buildDailyBrief(env)
    return {
      success: true,
      data: {
        date: brief.date,
        marketCount: brief.marketCount,
        topMovers: brief.topMovers.length,
        trending: brief.trending.length,
        closingSoon: brief.closingSoon.length,
        emailsSent,
        usedHistoryFallback,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to build brief' }
  }
}

/**
 * resolveCalls — score any of the caller's open calls whose markets have
 * resolved, without rebuilding the brief. Cheap (one market-detail lookup per
 * distinct open market) and owner-billed; available to any signed-in user so
 * they can pull in fresh results on demand. The daily cron does this anyway.
 */
const resolveCalls: ActionHandler<Env> = async ({ env }) => {
  try {
    const resolved = await resolveCallsOnly(env)
    return { success: true, data: { resolved } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to resolve calls' }
  }
}

/**
 * analyzeMarket — generate (or return cached) AI Analyst write-up for a market.
 * Signed-in only (it spends owner news + LLM credits); the result is cached
 * publicly per market per day so repeat opens are free.
 */
const analyzeMarket: ActionHandler<Env> = async ({ tools, params }) => {
  const marketId = String(params.marketId ?? '')
  const question = String(params.question ?? '')
  if (!marketId || !question) {
    return { success: false, error: 'marketId and question are required' }
  }
  try {
    const analysis = await generateAnalysis(tools as unknown as AnalystTools, {
      marketId,
      question,
      eventTitle: params.eventTitle ? String(params.eventTitle) : undefined,
      topic: params.topic ? String(params.topic) : undefined,
      yesPrice: typeof params.yesPrice === 'number' ? params.yesPrice : undefined,
      date: etDateKey(),
    })
    return { success: true, data: analysis }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to analyze market' }
  }
}

export const actions: Record<string, ActionHandler<Env>> = {
  buildBrief,
  resolveCalls,
  analyzeMarket,
}
