/**
 * edition — the daily editorial "morning read".
 *
 * Threads the day's top markets and their recent coverage into one readable
 * piece (headline, lede, a handful of narrative stories, signoff). Runs inside
 * the daily cron via `buildEdition`, and is rendered both in-app (/edition) and
 * as the digest email.
 */

import type { Brief, BriefMarket, Edition, EditionStory } from './types'

const ANTHROPIC_MODEL = 'claude-sonnet-4-5'
const LEAD_COUNT = 5
const HEADLINES_PER_LEAD = 3

interface EditionCtx {
  records: {
    query: (collection: string, opts?: { where?: Record<string, unknown>; limit?: number }) => Promise<
      { recordId: string; data: Record<string, unknown> }[]
    >
    create: (collection: string, data: Record<string, unknown>) => Promise<unknown>
    update: (collection: string, recordId: string, data: Record<string, unknown>) => Promise<unknown>
  }
  integrations: { call: <T = unknown>(endpoint: string, params?: Record<string, unknown>) => Promise<T> }
}

interface NewsArticle {
  source?: { name?: string }
  title?: string
  description?: string
  url?: string
  publishedAt?: string
}

function newsQuery(m: BriefMarket): string {
  const base = m.eventTitle && m.eventTitle.length > 3 ? m.eventTitle : m.question
  return base
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
    .replace(/^will\s+/i, '')
    .replace(/\?+/g, '')
    .trim()
    .slice(0, 120)
}

async function fetchHeadlines(ctx: EditionCtx, m: BriefMarket): Promise<EditionStory['sources']> {
  try {
    const res = await ctx.integrations.call<{ articles?: NewsArticle[] }>(
      'newsapi/search-everything',
      { q: newsQuery(m), pageSize: 6, sortBy: 'relevancy', language: 'en', page: 1 },
    )
    const seen = new Set<string>()
    return (res?.articles ?? [])
      .filter((a) => {
        if (!a.title || !a.url || a.title === '[Removed]') return false
        const k = a.title.toLowerCase().slice(0, 60)
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      .slice(0, HEADLINES_PER_LEAD)
      .map((a) => ({
        title: a.title!,
        url: a.url!,
        source: a.source?.name ?? 'Source',
        publishedAt: a.publishedAt,
      }))
  } catch {
    return []
  }
}

/** Pick the lead markets for the edition (movers first, then trending/closing). */
function pickLeads(brief: Brief): BriefMarket[] {
  const seen = new Set<string>()
  const leads: BriefMarket[] = []
  for (const m of [...brief.topMovers, ...brief.trending, ...brief.closingSoon]) {
    if (!seen.has(m.marketId)) {
      seen.add(m.marketId)
      leads.push(m)
    }
  }
  return leads.slice(0, LEAD_COUNT)
}

function fallbackTake(m: BriefMarket): string {
  const pct = Math.round(m.yesPrice * 100)
  if (m.delta == null) return `The market puts ${m.outcomes[0] ?? 'Yes'} at ${pct}%. ${m.blurb}`
  const dir = m.delta >= 0 ? 'climbed' : 'slipped'
  return `${m.outcomes[0] ?? 'Yes'} ${dir} to ${pct}% overnight. ${m.blurb}`
}

/** Generate, persist, and return today's Edition. */
export async function buildEdition(ctx: EditionCtx, brief: Brief, date: string): Promise<Edition> {
  const leads = pickLeads(brief)

  // Gather coverage for each lead (bounded).
  const sourcesByMarket = new Map<string, EditionStory['sources']>()
  for (const m of leads) {
    sourcesByMarket.set(m.marketId, await fetchHeadlines(ctx, m))
  }

  // One editorial pass over the whole day.
  const marketBlocks = leads
    .map((m, i) => {
      const pct = Math.round(m.yesPrice * 100)
      const move =
        m.delta == null
          ? 'no prior reading'
          : `${m.delta >= 0 ? '+' : ''}${(m.delta * 100).toFixed(1)} pts overnight`
      const heads = (sourcesByMarket.get(m.marketId) ?? [])
        .map((s) => `   - ${s.source}: ${s.title}`)
        .join('\n')
      return `(${i + 1}) id=${m.marketId} | "${m.question}" | ${m.outcomes[0] ?? 'Yes'} ${pct}% | ${move}\n${heads || '   - (no fresh headlines)'}`
    })
    .join('\n\n')

  const system =
    'You are the editor of Bellwether, a calm daily newsletter on what prediction markets think — ' +
    'in the spirit of Morning Brew: smart, crisp, lightly witty, never hype, always neutral. ' +
    'Given today’s featured markets (with current odds, overnight moves, and recent headlines), ' +
    'write a short morning edition. Ground every claim in the supplied headlines and name outlets ' +
    'where relevant. No betting advice, no predictions of your own. Respond ONLY with a JSON object: ' +
    '{"headline": string (a punchy ≤8-word editorial headline for the day), ' +
    '"dek": string (one-sentence standfirst), ' +
    '"intro": string (2–3 sentences setting the scene across the markets), ' +
    '"stories": [{"id": string, "take": string (~45 words weaving the odds, the move, and the news)}], ' +
    '"signoff": string (one short closing line)}. One story object per market id provided. ' +
    'No prose outside the JSON, no code fences.'

  const user = `Date: ${date}\nMarkets scanned today: ${brief.marketCount}\n\nFeatured markets:\n${marketBlocks}`

  let parsed: {
    headline?: string
    dek?: string
    intro?: string
    signoff?: string
    stories?: { id?: string; take?: string }[]
  } = {}
  try {
    const res = await ctx.integrations.call<{ content?: { type: string; text?: string }[] }>(
      'anthropic/chat-completion',
      {
        model: ANTHROPIC_MODEL,
        max_tokens: 1600,
        temperature: 0.6,
        system,
        messages: [{ role: 'user', content: user }],
      },
    )
    const text = res?.content?.find((b) => b.type === 'text')?.text ?? ''
    const a = text.indexOf('{')
    const b = text.lastIndexOf('}')
    if (a !== -1 && b !== -1) parsed = JSON.parse(text.slice(a, b + 1))
  } catch {
    parsed = {}
  }

  const takeById = new Map((parsed.stories ?? []).map((s) => [String(s.id), s.take ?? '']))

  const stories: EditionStory[] = leads.map((m) => ({
    marketId: m.marketId,
    question: m.question,
    slug: m.slug,
    image: m.image,
    topic: m.topic,
    yesPrice: m.yesPrice,
    outcomes: m.outcomes,
    delta: m.delta,
    take: (takeById.get(m.marketId) ?? '').trim() || fallbackTake(m),
    sources: sourcesByMarket.get(m.marketId) ?? [],
  }))

  const friendlyDate = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const edition: Edition = {
    date,
    headline: (parsed.headline ?? '').trim() || 'What the smart money is watching',
    dek:
      (parsed.dek ?? '').trim() ||
      `The biggest moves and closest calls across prediction markets — ${friendlyDate}.`,
    intro:
      (parsed.intro ?? '').trim() ||
      `${brief.marketCount} markets in view this morning. Here’s where the money is leaning.`,
    stories,
    signoff: (parsed.signoff ?? '').trim() || 'That’s the read. Make your calls.',
    marketCount: brief.marketCount,
    generatedAt: Date.now(),
  }

  // Upsert by date.
  try {
    const existing = await ctx.records.query('editions', { where: { date }, limit: 1 })
    if (existing.length > 0) {
      await ctx.records.update('editions', existing[0].recordId, edition as unknown as Record<string, unknown>)
    } else {
      await ctx.records.create('editions', edition as unknown as Record<string, unknown>)
    }
  } catch {
    // Returning the edition still lets the email send.
  }

  return edition
}

// ─────────────────────────────────────────────────────────────────────────────
// Email rendering
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderStory(s: EditionStory, i: number): string {
  const pct = Math.round(s.yesPrice * 100)
  const deltaStr =
    s.delta == null
      ? ''
      : `<span style="color:${s.delta >= 0 ? '#16a34a' : '#dc2626'};font-weight:600;">${
          s.delta >= 0 ? '▲' : '▼'
        } ${Math.abs(s.delta * 100).toFixed(1)} pts</span>`
  const links = s.sources
    .slice(0, 3)
    .map(
      (src) =>
        `<a href="${escapeHtml(src.url)}" style="color:#7dd3fc;text-decoration:none;">${escapeHtml(src.source)}</a>`,
    )
    .join(' &nbsp;·&nbsp; ')
  return `<tr><td style="padding:18px 0;border-bottom:1px solid #23202a;">
    <div style="font-size:12px;color:#d8b36a;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">${i + 1} · ${escapeHtml(s.topic || 'Markets')}</div>
    <div style="font-size:17px;font-weight:700;color:#ece9e3;margin:4px 0;">${escapeHtml(s.question)}</div>
    <div style="font-size:13px;color:#989389;margin-bottom:6px;">${escapeHtml(s.outcomes[0] ?? 'Yes')} ${pct}% &nbsp; ${deltaStr}</div>
    <div style="height:8px;background:rgba(236,233,227,0.10);border-radius:4px;margin-bottom:10px;">
      <div style="height:8px;width:${Math.max(2, Math.min(100, pct))}%;background:#d8b36a;border-radius:4px;font-size:0;line-height:0;">&nbsp;</div>
    </div>
    <div style="font-size:15px;line-height:1.6;color:#cdc8be;">${escapeHtml(s.take)}</div>
    ${links ? `<div style="font-size:12px;color:#64748b;margin-top:8px;">In the news: ${links}</div>` : ''}
  </td></tr>`
}

/** Render the Edition as a polished HTML email. */
export function renderEditionEmail(edition: Edition, appUrl = 'https://bellwether.app.space'): string {
  const friendlyDate = new Date(`${edition.date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  return `<div style="background:#0a0a0c;padding:28px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:600px;margin:0 auto;">
      <div style="border-bottom:2px solid #d8b36a;padding-bottom:12px;margin-bottom:20px;">
        <div style="font-family:Georgia,serif;font-size:30px;font-weight:700;color:#ece9e3;letter-spacing:-0.02em;">Bellwether</div>
        <div style="font-size:12px;color:#989389;text-transform:uppercase;letter-spacing:0.12em;margin-top:4px;">The Edition · ${friendlyDate}</div>
      </div>
      <div style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#ece9e3;line-height:1.25;">${escapeHtml(edition.headline)}</div>
      <div style="font-size:15px;color:#989389;font-style:italic;margin:6px 0 16px;">${escapeHtml(edition.dek)}</div>
      <div style="font-size:16px;line-height:1.65;color:#cdc8be;border-left:3px solid #d8b36a;padding-left:14px;">${escapeHtml(edition.intro)}</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
        ${edition.stories.map(renderStory).join('')}
      </table>
      <div style="font-size:15px;color:#ece9e3;font-style:italic;margin:20px 0;">${escapeHtml(edition.signoff)}</div>
      <a href="${appUrl}/edition" style="display:inline-block;background:#d8b36a;color:#1a1408;font-weight:600;font-size:14px;text-decoration:none;padding:10px 18px;border-radius:8px;">Read it in the app →</a>
      <div style="margin-top:24px;color:#64748b;font-size:12px;">Odds from Polymarket; coverage via the day’s reporting. Informational only — not financial advice.</div>
    </div>
  </div>`
}
