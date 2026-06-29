/**
 * calls — a user's logged forecasts on markets (the forecasting loop).
 *
 * Per-user (owned, userBound). Users create/update their own open calls; the
 * scoring cron writes the resolution fields (status/brier/…) via privileged
 * server code (bypasses RBAC), so members don't get write access to those.
 */

import type { CollectionSchema } from 'deepspace/worker'

export const callsSchema: CollectionSchema = {
  name: 'calls',
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'marketId', storage: 'text', interpretation: 'plain' },
    { name: 'question', storage: 'text', interpretation: 'plain' },
    { name: 'slug', storage: 'text', interpretation: 'plain' },
    { name: 'image', storage: 'text', interpretation: { kind: 'url' } },
    { name: 'topic', storage: 'text', interpretation: 'plain' },
    { name: 'eventTitle', storage: 'text', interpretation: 'plain' },
    { name: 'outcomes', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'endDate', storage: 'text', interpretation: 'plain' },
    { name: 'predictedProb', storage: 'number', interpretation: { kind: 'percent' } },
    { name: 'marketProbAtCall', storage: 'number', interpretation: { kind: 'percent' } },
    { name: 'note', storage: 'text', interpretation: 'plain' },
    { name: 'createdAtMs', storage: 'number', interpretation: { kind: 'datetime' } },
    {
      name: 'status',
      storage: 'text',
      interpretation: { kind: 'select', options: ['open', 'resolved'] },
    },
    { name: 'resolvedOutcome', storage: 'number', interpretation: 'plain' },
    { name: 'resolvedAt', storage: 'number', interpretation: { kind: 'datetime' } },
    { name: 'brier', storage: 'number', interpretation: 'plain' },
    { name: 'marketBrier', storage: 'number', interpretation: 'plain' },
    { name: 'beatMarket', storage: 'text', interpretation: { kind: 'boolean' } },
  ],
  ownerField: 'userId',
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
