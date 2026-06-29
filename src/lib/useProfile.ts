/** Read/publish the user's own forecaster profile; read any public profile. */

import { useCallback, useMemo } from 'react'
import { useQuery, useMutations, useUser } from 'deepspace'
import type { ForecasterProfile, ForecasterStats } from '../types'

/** Build the public top-categories list from full stats. */
function topCategories(stats: ForecasterStats): ForecasterProfile['topCategories'] {
  return stats.byCategory
    .filter((c) => c.resolved > 0)
    .slice(0, 4)
    .map((c) => ({ topic: c.topic, accuracy: c.accuracy, resolved: c.resolved }))
}

export function useMyProfile(stats: ForecasterStats): {
  profile: ForecasterProfile | null
  isPublic: boolean
  publish: (makePublic: boolean) => Promise<void>
  saving: boolean
} {
  const { user } = useUser()
  const { records } = useQuery<ForecasterProfile>('profiles')
  const { create, put } = useMutations<ForecasterProfile>('profiles')

  // Our own row is the one whose userId matches us (or the only writable one).
  const row = useMemo(() => {
    if (!records) return null
    if (user?.id) {
      const mine = records.find((r) => r.data.userId === user.id)
      if (mine) return mine
    }
    return null
  }, [records, user?.id])

  const publish = useCallback(
    async (makePublic: boolean) => {
      const data: Partial<ForecasterProfile> = {
        name: user?.name || 'Anonymous forecaster',
        visibility: makePublic ? 'public' : 'private',
        accuracy: stats.accuracy,
        skillScore: stats.skillScore,
        beatMarketRate: stats.beatMarketRate,
        resolved: stats.resolved,
        topCategories: topCategories(stats),
        updatedAtMs: Date.now(),
      }
      if (row) await put(row.recordId, data)
      else await create(data as ForecasterProfile)
    },
    [row, create, put, user, stats],
  )

  return {
    profile: row?.data ?? null,
    isPublic: row?.data.visibility === 'public',
    publish,
    saving: false,
  }
}

/** Read a single public profile by userId (for the public /u/:userId page). */
export function usePublicProfile(userId: string): {
  profile: ForecasterProfile | null
  loading: boolean
} {
  const { records, status } = useQuery<ForecasterProfile>('profiles')
  const profile = useMemo(
    () =>
      (records ?? []).find((r) => r.data.userId === userId && r.data.visibility === 'public')?.data ??
      null,
    [records, userId],
  )
  return { profile, loading: status === 'loading' }
}
