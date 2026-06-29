/**
 * streaks — per-user daily forecasting streak (one row per user).
 * Client-owned; bumped each day the user logs a call.
 */

import type { CollectionSchema } from 'deepspace/worker'

export const streaksSchema: CollectionSchema = {
  name: 'streaks',
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'currentStreak', storage: 'number', interpretation: 'plain' },
    { name: 'longestStreak', storage: 'number', interpretation: 'plain' },
    { name: 'lastCallDate', storage: 'text', interpretation: 'plain' },
    { name: 'updatedAtMs', storage: 'number', interpretation: { kind: 'datetime' } },
  ],
  ownerField: 'userId',
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
