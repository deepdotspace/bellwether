/**
 * editions — the daily editorial "morning read" (one record per day,
 * recordId = `YYYY-MM-DD`).
 *
 * Written by privileged server code (cron / refresh). Public-read so the
 * Edition renders for anyone and is shareable.
 */

import type { CollectionSchema } from 'deepspace/worker'

export const editionsSchema: CollectionSchema = {
  name: 'editions',
  columns: [
    { name: 'date', storage: 'text', interpretation: 'plain' },
    { name: 'headline', storage: 'text', interpretation: 'plain' },
    { name: 'dek', storage: 'text', interpretation: 'plain' },
    { name: 'intro', storage: 'text', interpretation: 'plain' },
    { name: 'stories', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'signoff', storage: 'text', interpretation: 'plain' },
    { name: 'marketCount', storage: 'number', interpretation: 'plain' },
    { name: 'generatedAt', storage: 'number', interpretation: { kind: 'datetime' } },
  ],
  permissions: {
    '*': { read: true, create: false, update: false, delete: false },
    viewer: { read: true, create: false, update: false, delete: false },
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
