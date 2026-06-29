/**
 * AI Analyst — news-sourced bull/bear analysis for a market.
 *
 * Runs inside the analyzeMarket server action (`tools` bypass RBAC; integrations
 * are owner-billed). Pulls recent headlines from newsapi, asks Anthropic for a
 * neutral, source-grounded write-up, and caches it per market per day.
 */

import type { MarketAnalysis } from './types'

const ANTHROPIC_MODEL = 'claude-sonnet-4-5'

/** The slice of action `tools` the analyst needs. */
export interface AnalystTools {
  query: (
    collection: string,
    opts?: { where?: Record<string, unknown>; limit?: number },
  ) => Promise<{ success: boolean; data?: { records: { recordId: string; data: Record<string, unknown> }[] } }>
  create: (collection: string, data: Record<string, unknown>) => Promise<{ success: boolean; data?: { recordId: string } }>
  update: (
    collection: string,
    recordId: string,
    data: Record<string, unknown>,
  ) => Promise<{ success: boolean }>
  integration: <T = unknown>(
    endpoint: string,
    data?: Record<string, unknown>,
  ) => Promise<{ success: boolean; data?: T; error?: string }>
}

export interface AnalyzeParams {
  marketId: string
  question: string
  eventTitle?: string
  topic?: string
  /** Current implied probability of the primary outcome (0..1). */
  yesPrice?: number
  /** ET date key (YYYY-MM-DD) for cache scoping. */
  date: string
}

interface NewsArticle {
  source?: { name?: string }
  title?: string
  description?: string
  url?: string
  publishedAt?: string
}

/** Build a news query from the market, stripping date noise. */
function buildQuery(p: AnalyzeParams): string {
  const stripDates = (s: string) =>
    s
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
      .replace(/\bon\s*$/i, '')
      .replace(/^will\s+/i, '')
      .replace(/\?+/g, '')
      .trim()
  const base = p.eventTitle && p.eventTitle.length > 3 ? p.eventTitle : p.question
  return stripDates(base).slice(0, 120)
}

export async function generateAnalysis(
  tools: AnalystTools,
  p: AnalyzeParams,
): Promise<MarketAnalysis> {
  // 1. Cache hit for today?
  const cached = await tools.query('analyses', { where: { marketId: p.marketId }, limit: 1 })
  const existing = cached.success ? cached.data?.records?.[0] : undefined
  if (existing && (existing.data as unknown as MarketAnalysis).date === p.date) {
    return existing.data as unknown as MarketAnalysis
  }

  // 2. Recent headlines.
  let sources: MarketAnalysis['sources'] = []
  try {
    const news = await tools.integration<{ articles?: NewsArticle[] }>('newsapi/search-everything', {
      q: buildQuery(p),
      pageSize: 6,
      sortBy: 'relevancy',
      language: 'en',
      page: 1,
    })
    const articles = news.success ? news.data?.articles ?? [] : []
    sources = articles
      .filter((a) => a.title && a.url)
      .slice(0, 6)
      .map((a) => ({
        title: a.title!,
        url: a.url!,
        source: a.source?.name ?? 'Source',
        publishedAt: a.publishedAt,
      }))
  } catch {
    sources = []
  }

  // 3. Neutral analysis grounded in the headlines.
  const pct = p.yesPrice != null ? `${Math.round(p.yesPrice * 100)}%` : 'unknown'
  const headlineBlock =
    sources.length > 0
      ? sources.map((s, i) => `[${i + 1}] ${s.source}: ${s.title}`).join('\n')
      : '(no recent headlines were retrieved)'

  const system =
    'You are a neutral prediction-market analyst. Given a market question, its current implied ' +
    'odds, and a list of recent headlines, write a calm, balanced briefing. Be measured and ' +
    'specific; ground every claim in the supplied headlines and refer to them by source name. ' +
    'Do NOT invent facts or events not present in the headlines. Do NOT give betting advice. ' +
    'Return ONLY a JSON object with keys "summary", "bullCase", "bearCase", "whatCouldMove" — ' +
    'each a single short paragraph (max ~55 words). No prose outside the JSON, no code fences. ' +
    '"bullCase" = why the primary outcome (Yes) could happen; "bearCase" = why it might not; ' +
    '"whatCouldMove" = the catalysts to watch.'

  const user =
    `Market: "${p.question}"\nCurrent implied odds (Yes): ${pct}\n\nRecent headlines:\n${headlineBlock}`

  let parsed: Partial<MarketAnalysis> = {}
  try {
    const ai = await tools.integration<{ content?: { type: string; text?: string }[] }>(
      'anthropic/chat-completion',
      {
        model: ANTHROPIC_MODEL,
        max_tokens: 900,
        temperature: 0.4,
        system,
        messages: [{ role: 'user', content: user }],
      },
    )
    const text = ai.success ? ai.data?.content?.find((b) => b.type === 'text')?.text ?? '' : ''
    const a = text.indexOf('{')
    const b = text.lastIndexOf('}')
    if (a !== -1 && b !== -1) parsed = JSON.parse(text.slice(a, b + 1))
  } catch {
    parsed = {}
  }

  const analysis: MarketAnalysis = {
    marketId: p.marketId,
    date: p.date,
    question: p.question,
    summary: (parsed.summary ?? '').trim() || 'A balanced read on this market based on the latest available information.',
    bullCase: (parsed.bullCase ?? '').trim() || 'No strong recent catalysts surfaced for the Yes side.',
    bearCase: (parsed.bearCase ?? '').trim() || 'No strong recent catalysts surfaced for the No side.',
    whatCouldMove: (parsed.whatCouldMove ?? '').trim() || 'Watch for fresh reporting and any change in market volume.',
    sources,
    generatedAt: Date.now(),
  }

  // 4. Cache (upsert by market).
  try {
    if (existing) {
      await tools.update('analyses', existing.recordId, analysis as unknown as Record<string, unknown>)
    } else {
      await tools.create('analyses', analysis as unknown as Record<string, unknown>)
    }
  } catch {
    // Returning the analysis is more important than caching it.
  }

  return analysis
}
