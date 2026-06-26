/** Small display helpers for odds, deltas, volume, and close dates. */

/** 0.42 -> "42%". */
export function formatPct(p: number, digits = 0): string {
  return `${(p * 100).toFixed(digits)}%`
}

/** Signed overnight delta in points, e.g. +3.4 / -1.2. Null -> null. */
export function formatDelta(delta: number | null): string | null {
  if (delta == null) return null
  const pts = delta * 100
  const sign = pts >= 0 ? '+' : '−'
  return `${sign}${Math.abs(pts).toFixed(1)} pts`
}

/** Compact USD, e.g. $1.2M, $84K. */
export function formatUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n)}`
}

/** "in 3 days" / "in 5 hours" / "today" / "closed". */
export function formatCloses(endDate: string | null): string {
  if (!endDate) return 'No close date'
  const t = Date.parse(endDate)
  if (!Number.isFinite(t)) return 'No close date'
  const ms = t - Date.now()
  if (ms <= 0) return 'Closed'
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  if (days >= 1) return `Closes in ${days} day${days === 1 ? '' : 's'}`
  const hours = Math.max(1, Math.floor(ms / (60 * 60 * 1000)))
  return `Closes in ${hours} hour${hours === 1 ? '' : 's'}`
}

/** Friendly long date for a YYYY-MM-DD key. */
export function formatBriefDate(date: string): string {
  const t = Date.parse(`${date}T12:00:00Z`)
  if (!Number.isFinite(t)) return date
  return new Date(t).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Title-case a topic ticker/slug like "us-election" -> "Us Election". */
export function formatTopic(topic: string): string {
  if (!topic) return 'Markets'
  return topic
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}
