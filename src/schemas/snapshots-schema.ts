/**
 * snapshots — raw daily odds captures used to compute overnight movers
 * (one record per day, recordId = `YYYY-MM-DD`).
 *
 * Internal bookkeeping: written and read only by privileged server code.
 * Not exposed to clients.
 */

import type { CollectionSchema } from 'deepspace/worker'

export const snapshotsSchema: CollectionSchema = {
  name: 'snapshots',
  columns: [
    { name: 'date', storage: 'text', interpretation: 'plain' },
    { name: 'capturedAt', storage: 'number', interpretation: { kind: 'datetime' } },
    { name: 'markets', storage: 'text', interpretation: { kind: 'json' } },
  ],
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: false, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
