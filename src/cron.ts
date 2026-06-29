/**
 * Cron tasks for Bellwether.
 *
 * `daily-brief` runs each morning: it snapshots Polymarket odds, diffs against
 * yesterday for overnight movers, writes the AI blurbs, publishes the day's
 * brief, and emails opted-in users. The heavy lifting lives in
 * `src/brief-core.ts` so the buildBrief action can reuse the exact same logic.
 */

import type { CronTask } from 'deepspace/worker'
import { buildDailyBrief, etDateKey } from './brief-core'
import type { Env } from '../worker'

export const tasks: CronTask[] = [
  // 6:30am US Eastern — after overnight order flow, before the day starts.
  { name: 'daily-brief', schedule: '30 6 * * *', timezone: 'America/New_York' },
]

export async function runTask(name: string, env: Env): Promise<void> {
  if (name === 'daily-brief') {
    const result = await buildDailyBrief(env, { sendAlerts: true })
    console.log(
      `[bellwether] brief ${etDateKey()} built — ${result.brief.marketCount} markets, ` +
        `${result.brief.topMovers.length} movers, ${result.callsResolved} calls resolved, ` +
        `${result.swingAlerts} swing alerts, ${result.emailsSent} emails sent` +
        (result.usedHistoryFallback ? ' (history fallback)' : ''),
    )
  }
}
