/**
 * preferences — per-user digest settings (email opt-in + address).
 *
 * Per-user (owned). One row per user; the client upserts at recordId = userId.
 * The daily cron reads this collection (bypassing RBAC) to decide who gets the
 * email digest.
 */

import type { CollectionSchema } from 'deepspace/worker'

export const preferencesSchema: CollectionSchema = {
  name: 'preferences',
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'emailEnabled', storage: 'text', interpretation: { kind: 'boolean' } },
    { name: 'email', storage: 'text', interpretation: { kind: 'email' } },
  ],
  ownerField: 'userId',
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
