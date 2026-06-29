/**
 * profiles — a publishable snapshot of a user's scorecard.
 *
 * Per-user (owned, userBound). A profile is only visible to others once the
 * user flips `isPublic` — `visibilityField` gates reads, so anonymous/other
 * users see published profiles only, while owners always see their own.
 */

import type { CollectionSchema } from 'deepspace/worker'

export const profilesSchema: CollectionSchema = {
  name: 'profiles',
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'name', storage: 'text', interpretation: 'plain' },
    {
      name: 'visibility',
      storage: 'text',
      interpretation: { kind: 'select', options: ['public', 'private'] },
    },
    { name: 'accuracy', storage: 'number', interpretation: { kind: 'percent' } },
    { name: 'skillScore', storage: 'number', interpretation: 'plain' },
    { name: 'beatMarketRate', storage: 'number', interpretation: { kind: 'percent' } },
    { name: 'resolved', storage: 'number', interpretation: 'plain' },
    { name: 'topCategories', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'updatedAtMs', storage: 'number', interpretation: { kind: 'datetime' } },
  ],
  ownerField: 'userId',
  visibilityField: { field: 'visibility', value: 'public' },
  permissions: {
    '*': { read: 'published', create: false, update: false, delete: false },
    viewer: { read: 'published', create: false, update: false, delete: false },
    member: { read: 'published', create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
