/**
 * briefs — the published daily brief (one record per day, recordId = `YYYY-MM-DD`).
 *
 * Written only by privileged server code (cron task + buildBrief action, which
 * bypass RBAC). Readable by everyone so the brief renders for anonymous
 * visitors as well as signed-in users.
 */

import type { CollectionSchema } from 'deepspace/worker'

export const briefsSchema: CollectionSchema = {
  name: 'briefs',
  columns: [
    { name: 'date', storage: 'text', interpretation: 'plain' },
    { name: 'generatedAt', storage: 'number', interpretation: { kind: 'datetime' } },
    { name: 'marketCount', storage: 'number', interpretation: 'plain' },
    { name: 'topMovers', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'trending', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'closingSoon', storage: 'text', interpretation: { kind: 'json' } },
  ],
  permissions: {
    '*': { read: true, create: false, update: false, delete: false },
    viewer: { read: true, create: false, update: false, delete: false },
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
