/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 *
 * Add schemas by creating a file in src/schemas/ and importing it here.
 */

import type { CollectionSchema } from 'deepspace/worker'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import { briefsSchema } from './schemas/briefs-schema'
import { snapshotsSchema } from './schemas/snapshots-schema'
import { followsSchema } from './schemas/follows-schema'
import { preferencesSchema } from './schemas/preferences-schema'
import { callsSchema } from './schemas/calls-schema'
import { streaksSchema } from './schemas/streaks-schema'
import { analysesSchema } from './schemas/analyses-schema'
import { notificationsSchema } from './schemas/notifications-schema'
import { profilesSchema } from './schemas/profiles-schema'
import { editionsSchema } from './schemas/editions-schema'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  briefsSchema,
  snapshotsSchema,
  followsSchema,
  preferencesSchema,
  callsSchema,
  streaksSchema,
  analysesSchema,
  notificationsSchema,
  profilesSchema,
  editionsSchema,
]
