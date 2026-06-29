/**
 * analyses — cached AI Analyst write-ups (one per market per day).
 *
 * Written by the analyzeMarket action (server, bypasses RBAC). Public-read so
 * the analysis renders for anyone, and the cache spares repeat generation cost.
 */

import type { CollectionSchema } from 'deepspace/worker'

export const analysesSchema: CollectionSchema = {
  name: 'analyses',
  columns: [
    { name: 'marketId', storage: 'text', interpretation: 'plain' },
    { name: 'date', storage: 'text', interpretation: 'plain' },
    { name: 'question', storage: 'text', interpretation: 'plain' },
    { name: 'summary', storage: 'text', interpretation: 'plain' },
    { name: 'bullCase', storage: 'text', interpretation: 'plain' },
    { name: 'bearCase', storage: 'text', interpretation: 'plain' },
    { name: 'whatCouldMove', storage: 'text', interpretation: 'plain' },
    { name: 'sources', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'generatedAt', storage: 'number', interpretation: { kind: 'datetime' } },
  ],
  permissions: {
    '*': { read: true, create: false, update: false, delete: false },
    viewer: { read: true, create: false, update: false, delete: false },
    member: { read: true, create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
