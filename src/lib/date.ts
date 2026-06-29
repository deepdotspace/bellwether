/** Shared date helpers — the brief's "day" is US Eastern. */

/** YYYY-MM-DD in US Eastern. */
export function etDateKey(ts: number = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ts))
}

/** The ET date key for the day before a given YYYY-MM-DD key. */
export function etPrevDateKey(dateKey: string): string {
  // Anchor at noon UTC to avoid DST edge cases, step back 24h, reformat.
  const t = Date.parse(`${dateKey}T12:00:00Z`)
  return etDateKey(t - 24 * 60 * 60 * 1000)
}
