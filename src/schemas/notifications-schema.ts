/**
 * notifications — resolution recaps + swing alerts (server-written).
 *
 * Written by privileged server code (cron / resolution), which sets `userId`
 * explicitly for the target user — so `userId` is NOT userBound here (the
 * writer is the app owner, not the recipient; userBound would stamp every
 * notification to the owner). Recipients read/mark-read their own rows via the
 * `'own'` rule keyed on the `userId` column.
 *
 * NOTE: the boot-time `[schema-lint]` warning about userId not being userBound
 * is a known false-positive here — `create` is `false` for every non-admin
 * role, so no untrusted client can ever write a row with a spoofed userId.
 * Do NOT "fix" it by adding userBound: true; that would break server writes.
 */

import type { CollectionSchema } from 'deepspace/worker'

export const notificationsSchema: CollectionSchema = {
  name: 'notifications',
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain', immutable: true },
    {
      name: 'type',
      storage: 'text',
      interpretation: { kind: 'select', options: ['resolution', 'swing'] },
    },
    { name: 'title', storage: 'text', interpretation: 'plain' },
    { name: 'body', storage: 'text', interpretation: 'plain' },
    { name: 'marketId', storage: 'text', interpretation: 'plain' },
    { name: 'slug', storage: 'text', interpretation: 'plain' },
    { name: 'read', storage: 'text', interpretation: { kind: 'boolean' } },
    { name: 'createdAtMs', storage: 'number', interpretation: { kind: 'datetime' } },
  ],
  ownerField: 'userId',
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: false, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
