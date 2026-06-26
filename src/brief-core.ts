/**
 * brief-core — the engine that builds Bellwether's daily brief.
 *
 * Runs server-side only (cron task + the buildBrief action). Both entry points
 * call `buildDailyBrief(env)`, which:
 *   1. pulls trending markets from the `polymarket` integration,
 *   2. persists today's odds snapshot (for overnight diffing),
 *   3. computes overnight movers (snapshot diff, with a price-history fallback
 *      so day-one briefs aren't empty),
 *   4. writes a short neutral AI blurb per featured market (one batched call),
 *   5. publishes the `briefs` record, and
 *   6. emails the digest to opted-in users.
 *
 * All record/integration I/O goes through `buildCronContext`, so everything
 * runs as the app owner (owner-billed, bypasses per-user RBAC).
 */

import { buildCronContext } from 'deepspace/worker'
import { SCOPE_ID } from './constants'
import type { Env } from '../worker'
import type {
  Brief,
  BriefMarket,
  Preference,
  Snapshot,
  SnapshotMarket,
} from './types'

/** Env plus the optional digest-sender override (set as a deploy secret). */
type BriefEnv = Env & { DIGEST_FROM?: string }

const CANDIDATE_POOL = 24 // markets we consider for movers / blurbs
const SECTION_SIZE = 6 // cards per section
const CLOSING_WINDOW_DAYS = 14
const ANTHROPIC_MODEL = 'claude-sonnet-4-5'

/** YYYY-MM-DD in US Eastern — the brief's "day" boundary. */
export function etDateKey(ts: number = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ts))
}

/** Safe JSON.parse for the stringified arrays Polymarket returns. */
function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function toNumber(value: unknown): number {
  const n = typeof value === 'string' ? parseFloat(value) : (value as number)
  return Number.isFinite(n) ? n : 0
}

/** Normalize one raw Polymarket market into our snapshot shape. */
function toSnapshotMarket(raw: Record<string, unknown>): SnapshotMarket | null {
  const outcomes = parseJsonArray(raw.outcomes).map(String)
  const outcomePrices = parseJsonArray(raw.outcomePrices).map(toNumber)
  const tokenIds = parseJsonArray(raw.clobTokenIds).map(String)
  if (outcomes.length === 0 || outcomePrices.length === 0) return null

  const events = Array.isArray(raw.events) ? (raw.events as Record<string, unknown>[]) : []
  const event = events[0] ?? {}
  const eventTitle = String(event.title ?? raw.question ?? '').trim()
  const topic = String(event.ticker ?? event.slug ?? '').trim()

  return {
    id: String(raw.id ?? ''),
    question: String(raw.question ?? '').trim(),
    slug: String(raw.slug ?? ''),
    yesPrice: outcomePrices[0] ?? 0,
    outcomes,
    outcomePrices,
    volume24hr: toNumber(raw.volume24hr),
    volume: toNumber(raw.volume ?? raw.volumeNum),
    liquidity: toNumber(raw.liquidity ?? raw.liquidityNum),
    endDate: (raw.endDate as string) ?? (raw.endDateIso as string) ?? null,
    topic,
    eventTitle,
    image: String(raw.image ?? raw.icon ?? event.image ?? ''),
    clobTokenId: tokenIds[0] ?? null,
  }
}

interface CronCtx {
  records: {
    query: (collection: string, opts?: { where?: Record<string, unknown>; limit?: number }) => Promise<
      { recordId: string; data: Record<string, unknown> }[]
    >
    create: (collection: string, data: Record<string, unknown>) => Promise<{ recordId: string }>
    update: (collection: string, recordId: string, data: Record<string, unknown>) => Promise<unknown>
  }
  integrations: { call: <T = unknown>(endpoint: string, params?: Record<string, unknown>) => Promise<T> }
  ownerUserId: string
}

/** Upsert a date-keyed record (briefs / snapshots) by its `date` field. */
async function upsertByDate(
  ctx: CronCtx,
  collection: string,
  date: string,
  data: Record<string, unknown>,
): Promise<void> {
  const existing = await ctx.records.query(collection, { where: { date }, limit: 1 })
  if (existing.length > 0) {
    await ctx.records.update(collection, existing[0].recordId, data)
  } else {
    await ctx.records.create(collection, data)
  }
}

/** Fetch the implied price ~24h ago from price history, for the day-one fallback. */
async function fetchPrevPriceFromHistory(ctx: CronCtx, tokenId: string): Promise<number | null> {
  try {
    const res = await ctx.integrations.call<{ history?: { t: number; p: number }[] }>(
      'polymarket/price-history',
      { token_id: tokenId, interval: '1d', fidelity: 60 },
    )
    const history = res?.history ?? []
    if (history.length < 2) return null
    // Earliest point in the 1-day window ≈ 24h ago.
    return toNumber(history[0].p)
  } catch {
    return null
  }
}

/** Build the AI blurbs for the featured markets in a single batched call. */
async function generateBlurbs(
  ctx: CronCtx,
  markets: { id: string; question: string; yesPrice: number; delta: number | null; volume24hr: number; eventTitle: string; endDate: string | null }[],
): Promise<Record<string, string>> {
  if (markets.length === 0) return {}

  const lines = markets.map((m) => {
    const pct = (m.yesPrice * 100).toFixed(1)
    const move =
      m.delta == null
        ? 'no prior reading'
        : `${m.delta >= 0 ? '+' : ''}${(m.delta * 100).toFixed(1)} pts overnight`
    const closes = m.endDate ? `closes ${m.endDate.slice(0, 10)}` : 'no close date'
    return `- id=${m.id} | "${m.question}" | now ${pct}% | ${move} | $${Math.round(m.volume24hr).toLocaleString()} 24h vol | ${closes}`
  })

  const system =
    'You are a neutral prediction-market analyst writing a calm morning brief. ' +
    'For each market, write ONE concise sentence (max 30 words) explaining, in plain English, ' +
    'what the current odds and overnight move suggest the market thinks — a "why this is where it is" framing. ' +
    'Be factual and measured. Do NOT give betting advice, predictions of your own, or hype. ' +
    'Never invent specific news events you were not given. ' +
    'Respond ONLY with a JSON object mapping each id to its sentence, e.g. {"123":"..."}. No prose, no code fences.'

  const user = `Write a one-sentence neutral blurb for each market:\n${lines.join('\n')}`

  try {
    const res = await ctx.integrations.call<{ content?: { type: string; text?: string }[] }>(
      'anthropic/chat-completion',
      {
        model: ANTHROPIC_MODEL,
        max_tokens: 1200,
        temperature: 0.3,
        system,
        messages: [{ role: 'user', content: user }],
      },
    )
    const text = res?.content?.find((b) => b.type === 'text')?.text ?? ''
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) return {}
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Record<string, string>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** A plain factual fallback blurb when the AI call doesn't cover a market. */
function fallbackBlurb(m: BriefMarket): string {
  const pct = (m.yesPrice * 100).toFixed(0)
  if (m.delta == null) {
    return `The market currently prices this at ${pct}% likely.`
  }
  if (Math.abs(m.delta) < 0.005) {
    return `Odds held roughly steady overnight at ${pct}%.`
  }
  const dir = m.delta > 0 ? 'rose' : 'fell'
  return `Implied odds ${dir} ${Math.abs(m.delta * 100).toFixed(1)} points overnight to ${pct}%.`
}

function toBriefMarket(
  m: SnapshotMarket,
  prevYesPrice: number | null,
  deltaSource: BriefMarket['deltaSource'],
): BriefMarket {
  const delta = prevYesPrice == null ? null : m.yesPrice - prevYesPrice
  return {
    marketId: m.id,
    question: m.question,
    slug: m.slug,
    yesPrice: m.yesPrice,
    prevYesPrice,
    delta,
    outcomes: m.outcomes,
    outcomePrices: m.outcomePrices,
    volume24hr: m.volume24hr,
    volume: m.volume,
    liquidity: m.liquidity,
    endDate: m.endDate,
    topic: m.topic,
    eventTitle: m.eventTitle,
    image: m.image,
    blurb: '',
    deltaSource,
  }
}

/**
 * Build (and persist) today's brief. Returns the brief plus a short report of
 * what happened, for logging / the action response.
 */
export async function buildDailyBrief(
  env: BriefEnv,
): Promise<{ brief: Brief; emailsSent: number; usedHistoryFallback: boolean }> {
  const ctx = buildCronContext(
    env as unknown as Parameters<typeof buildCronContext>[0],
    env.OWNER_USER_ID,
    SCOPE_ID,
  ) as unknown as CronCtx

  const now = Date.now()
  const date = etDateKey(now)

  // 1. Pull trending markets (most 24h volume first).
  const rawMarkets = await ctx.integrations.call<Record<string, unknown>[]>('polymarket/markets', {
    limit: 60,
    order: 'volume24hr',
    ascending: false,
    closed: false,
  })
  const markets = (Array.isArray(rawMarkets) ? rawMarkets : [])
    .map(toSnapshotMarket)
    .filter((m): m is SnapshotMarket => m != null && m.volume24hr > 0 && m.question.length > 0)

  // 2. Load the previous snapshot (most recent capture that isn't today).
  const allSnaps = await ctx.records.query('snapshots', { limit: 30 })
  const prevSnap = allSnaps
    .map((r) => r.data as unknown as Snapshot)
    .filter((s) => s.date && s.date !== date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  const prevById = new Map<string, SnapshotMarket>()
  if (prevSnap?.markets) for (const m of prevSnap.markets) prevById.set(m.id, m)

  // 3. Persist today's snapshot for tomorrow's diff.
  const snapshot: Snapshot = { date, capturedAt: now, markets }
  await upsertByDate(ctx, 'snapshots', date, snapshot as unknown as Record<string, unknown>)

  // 4. Resolve a prev price for the candidate pool (snapshot first, else history).
  const candidates = [...markets]
    .sort((a, b) => b.volume24hr - a.volume24hr)
    .slice(0, CANDIDATE_POOL)

  let usedHistoryFallback = false
  const briefByCandidate = new Map<string, BriefMarket>()
  for (const m of candidates) {
    const prev = prevById.get(m.id)
    if (prev) {
      briefByCandidate.set(m.id, toBriefMarket(m, prev.yesPrice, 'snapshot'))
      continue
    }
    if (m.clobTokenId) {
      const histPrev = await fetchPrevPriceFromHistory(ctx, m.clobTokenId)
      if (histPrev != null) {
        usedHistoryFallback = true
        briefByCandidate.set(m.id, toBriefMarket(m, histPrev, 'history'))
        continue
      }
    }
    briefByCandidate.set(m.id, toBriefMarket(m, null, 'none'))
  }

  // Helper to materialize a brief market (candidate cache or fresh, no delta).
  const asBrief = (m: SnapshotMarket): BriefMarket =>
    briefByCandidate.get(m.id) ?? toBriefMarket(m, prevById.get(m.id)?.yesPrice ?? null, prevById.has(m.id) ? 'snapshot' : 'none')

  // 5. Build the three sections.
  const topMovers = [...briefByCandidate.values()]
    .filter((m) => m.delta != null && Math.abs(m.delta) > 0.005)
    .sort((a, b) => Math.abs(b.delta!) - Math.abs(a.delta!))
    .slice(0, SECTION_SIZE)

  const trending = [...markets]
    .sort((a, b) => b.volume24hr - a.volume24hr)
    .slice(0, SECTION_SIZE)
    .map(asBrief)

  const horizon = now + CLOSING_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const closingSoon = [...markets]
    .filter((m) => {
      if (!m.endDate) return false
      const t = Date.parse(m.endDate)
      return Number.isFinite(t) && t > now && t <= horizon
    })
    .sort((a, b) => Date.parse(a.endDate!) - Date.parse(b.endDate!))
    .slice(0, SECTION_SIZE)
    .map(asBrief)

  // 6. One batched AI call for every featured market across all sections.
  const featured = new Map<string, BriefMarket>()
  for (const m of [...topMovers, ...trending, ...closingSoon]) featured.set(m.marketId, m)
  const blurbs = await generateBlurbs(
    ctx,
    [...featured.values()].map((m) => ({
      id: m.marketId,
      question: m.question,
      yesPrice: m.yesPrice,
      delta: m.delta,
      volume24hr: m.volume24hr,
      eventTitle: m.eventTitle,
      endDate: m.endDate,
    })),
  )
  for (const m of featured.values()) {
    m.blurb = (blurbs[m.marketId] ?? '').trim() || fallbackBlurb(m)
  }

  // 7. Publish the brief.
  const brief: Brief = {
    date,
    generatedAt: now,
    marketCount: markets.length,
    topMovers,
    trending,
    closingSoon,
  }
  await upsertByDate(ctx, 'briefs', date, brief as unknown as Record<string, unknown>)

  // 8. Email digest to opted-in users.
  let emailsSent = 0
  try {
    emailsSent = await sendDigests(ctx, env, brief)
  } catch {
    // Never fail the build because email delivery hiccuped.
  }

  return { brief, emailsSent, usedHistoryFallback }
}

/** Send the brief to every user who opted into the email digest. */
async function sendDigests(ctx: CronCtx, env: BriefEnv, brief: Brief): Promise<number> {
  const prefs = (await ctx.records.query('preferences', { limit: 200 }))
    .map((r) => r.data as unknown as Preference)
    .filter((p) => p.emailEnabled === true && typeof p.email === 'string' && p.email.includes('@'))

  if (prefs.length === 0) return 0

  const from = env.DIGEST_FROM || 'Bellwether <onboarding@resend.dev>'
  const subject = `Bellwether — ${brief.date}: ${brief.topMovers.length} movers, ${brief.trending.length} trending`
  const html = renderDigestHtml(brief)

  let sent = 0
  for (const p of prefs.slice(0, 100)) {
    try {
      await ctx.integrations.call('email/send', { from, to: p.email, subject, html })
      sent++
    } catch {
      // Skip a single bad address without aborting the rest.
    }
  }
  return sent
}

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`
}

function renderDigestSection(title: string, items: BriefMarket[]): string {
  if (items.length === 0) return ''
  const rows = items
    .map((m) => {
      const deltaStr =
        m.delta == null
          ? ''
          : `<span style="color:${m.delta >= 0 ? '#16a34a' : '#dc2626'};font-weight:600;">${
              m.delta >= 0 ? '▲' : '▼'
            } ${Math.abs(m.delta * 100).toFixed(1)} pts</span>`
      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #1e293b;">
          <div style="font-weight:600;color:#e2e8f0;font-size:15px;">${escapeHtml(m.question)}</div>
          <div style="margin:4px 0;color:#94a3b8;font-size:13px;">${escapeHtml(m.blurb)}</div>
          <div style="font-size:13px;color:#64748b;">${pct(m.yesPrice)} ${deltaStr}</div>
        </td>
      </tr>`
    })
    .join('')
  return `<h2 style="font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#7dd3fc;margin:24px 0 4px;">${title}</h2>
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>`
}

function renderDigestHtml(brief: Brief): string {
  return `<div style="background:#0f172a;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e2e8f0;">
    <div style="max-width:600px;margin:0 auto;">
      <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;letter-spacing:-0.02em;">Bellwether</div>
      <div style="color:#94a3b8;font-size:14px;margin-bottom:8px;">What the smart money thinks — ${brief.date}</div>
      ${renderDigestSection('Top movers', brief.topMovers)}
      ${renderDigestSection('Trending', brief.trending)}
      ${renderDigestSection('Closing soon', brief.closingSoon)}
      <div style="margin-top:28px;color:#64748b;font-size:12px;">
        Odds sourced from Polymarket. Informational only — not financial advice.
      </div>
    </div>
  </div>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
