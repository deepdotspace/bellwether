/** Client data hooks for the brief, follows, and digest preferences. */

import { useCallback, useMemo } from 'react'
import { useQuery, useMutations, useAuth, getAuthToken } from 'deepspace'
import type { Brief, Follow, Preference } from '../types'

/** The most recent published brief (briefs are keyed by date). */
export function useLatestBrief(): { brief: Brief | null; loading: boolean } {
  const { records, status } = useQuery<Brief>('briefs')
  const brief = useMemo(() => {
    if (!records || records.length === 0) return null
    const sorted = [...records].sort((a, b) => (a.data.date < b.data.date ? 1 : -1))
    return sorted[0].data
  }, [records])
  return { brief, loading: status === 'loading' }
}

export interface FollowsApi {
  follows: { recordId: string; data: Follow }[]
  isFollowing: (type: Follow['targetType'], targetId: string) => boolean
  toggle: (
    type: Follow['targetType'],
    targetId: string,
    label: string,
    image?: string,
  ) => Promise<void>
  canFollow: boolean
}

/** Per-user follows for markets and topics. */
export function useFollows(): FollowsApi {
  const { isSignedIn } = useAuth()
  const { records } = useQuery<Follow>('follows')
  const { create, remove } = useMutations<Follow>('follows')

  const follows = records ?? []

  const find = useCallback(
    (type: Follow['targetType'], targetId: string) =>
      follows.find((r) => r.data.targetType === type && r.data.targetId === targetId),
    [follows],
  )

  const isFollowing = useCallback(
    (type: Follow['targetType'], targetId: string) => Boolean(find(type, targetId)),
    [find],
  )

  const toggle = useCallback(
    async (type: Follow['targetType'], targetId: string, label: string, image = '') => {
      const existing = find(type, targetId)
      if (existing) {
        await remove(existing.recordId)
      } else {
        await create({ targetType: type, targetId, label, image } as Follow)
      }
    },
    [find, create, remove],
  )

  return { follows, isFollowing, toggle, canFollow: isSignedIn }
}

/** Per-user email digest preference (one row, upserted by the client). */
export function usePreference(): {
  pref: Preference | null
  recordId: string | null
  save: (next: Partial<Preference>) => Promise<void>
} {
  const { records } = useQuery<Preference>('preferences')
  const { create, put } = useMutations<Preference>('preferences')

  const row = records && records.length > 0 ? records[0] : null

  const save = useCallback(
    async (next: Partial<Preference>) => {
      if (row) {
        await put(row.recordId, next as Partial<Preference>)
      } else {
        await create({ emailEnabled: false, email: '', ...next } as Preference)
      }
    },
    [row, create, put],
  )

  return { pref: row?.data ?? null, recordId: row?.recordId ?? null, save }
}

/** Trigger the owner-only buildBrief action. */
export async function triggerBuildBrief(): Promise<{ success: boolean; error?: string; data?: unknown }> {
  const res = await fetch('/api/actions/buildBrief', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getAuthToken()}`,
    },
    body: JSON.stringify({}),
  })
  return res.json()
}
