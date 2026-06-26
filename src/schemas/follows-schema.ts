/**
 * follows — markets/topics a user follows, to personalize their brief.
 *
 * Per-user (owned). `userId` is stamped server-side from the verified JWT
 * (userBound), so a client can never write a row for someone else.
 */

import type { CollectionSchema } from 'deepspace/worker'

export const followsSchema: CollectionSchema = {
  name: 'follows',
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    {
      name: 'targetType',
      storage: 'text',
      interpretation: { kind: 'select', options: ['market', 'topic'] },
    },
    { name: 'targetId', storage: 'text', interpretation: 'plain' },
    { name: 'label', storage: 'text', interpretation: 'plain' },
    { name: 'image', storage: 'text', interpretation: { kind: 'url' } },
  ],
  ownerField: 'userId',
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
