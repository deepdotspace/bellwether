/**
 * Cron tasks for Bellwether.
 *
 * `daily-brief` runs every few hours: it snapshots Polymarket odds, diffs for
 * overnight movers, writes the AI blurbs, and publishes the day's brief. The
 * editorial Edition + email + swing alerts inside it are gated to fire only
 * once per day (first run), so intraday refreshes keep odds current without
 * re-spamming. The heavy lifting lives in `src/brief-core.ts` so the buildBrief
 * action can reuse the exact same logic.
 *
 * Why an interval (not a 6:30am cron)? A DO alarm only arms when the cron DO is
 * first constructed. `<CronKeepAlive>` in the app shell wakes it on load, and an
 * interval task fires immediately on that first arm — so today's content builds
 * as soon as anyone opens the app, with no missed-window gap.
 */

import type { CronTask } from 'deepspace/worker'
import { buildDailyBrief, etDateKey } from './brief-core'
import type { Env } from '../worker'

export const tasks: CronTask[] = [
  // Every 6 hours — fires immediately on first arm, then keeps odds current.
  { name: 'daily-brief', intervalMinutes: 360 },
]

export async function runTask(name: string, env: Env): Promise<void> {
  if (name === 'daily-brief') {
    const result = await buildDailyBrief(env, { sendAlerts: true })
    console.log(
      `[bellwether] brief ${etDateKey()} built — ${result.brief.marketCount} markets, ` +
        `${result.brief.topMovers.length} movers, ${result.callsResolved} calls resolved, ` +
        `${result.swingAlerts} swing alerts, edition ${result.editionBuilt ? 'ok' : 'skipped'}, ` +
        `${result.emailsSent} emails sent` +
        (result.usedHistoryFallback ? ' (history fallback)' : ''),
    )
  }
}
