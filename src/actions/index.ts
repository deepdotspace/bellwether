import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { buildDailyBrief } from '../brief-core'

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

export const actions: Record<string, ActionHandler<Env>> = {
  buildBrief,
}
