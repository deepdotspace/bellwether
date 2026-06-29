/** Per-user daily streak: read it, and bump it when a call is logged. */

import { useCallback, useMemo } from 'react'
import { useQuery, useMutations } from 'deepspace'
import type { Streak } from '../types'
import { etDateKey } from './date'
import { nextStreak, isStreakActive } from './streak'

export interface StreakApi {
  streak: Streak | null
  active: boolean
  /** Record that the user logged a call today; advances/continues the streak. */
  bumpToday: () => Promise<void>
}

export function useStreak(): StreakApi {
  const { records } = useQuery<Streak>('streaks')
  const { create, put } = useMutations<Streak>('streaks')

  const row = records && records.length > 0 ? records[0] : null
  const streak = row?.data ?? null
  const today = etDateKey()

  const bumpToday = useCallback(async () => {
    const patch = nextStreak(streak, today)
    if (!patch) return // already counted today
    if (row) {
      await put(row.recordId, patch as Partial<Streak>)
    } else {
      await create({
        currentStreak: patch.currentStreak ?? 1,
        longestStreak: patch.longestStreak ?? 1,
        lastCallDate: patch.lastCallDate ?? today,
        updatedAtMs: patch.updatedAtMs ?? Date.now(),
      } as Streak)
    }
  }, [streak, today, row, create, put])

  const active = useMemo(() => isStreakActive(streak, today), [streak, today])

  return { streak, active, bumpToday }
}
