/** Pure streak math — shared by the hook and unit tests. */

import type { Streak } from '../types'
import { etPrevDateKey } from './date'

/**
 * Given the previous streak record and today's ET date key, return the patch
 * to apply. Returns null if the user already logged a call today (no change).
 */
export function nextStreak(prev: Streak | null, today: string): Partial<Streak> | null {
  if (prev && prev.lastCallDate === today) return null // already counted today

  const continued = prev && prev.lastCallDate === etPrevDateKey(today)
  const currentStreak = continued ? prev.currentStreak + 1 : 1
  const longestStreak = Math.max(prev?.longestStreak ?? 0, currentStreak)

  return {
    currentStreak,
    longestStreak,
    lastCallDate: today,
    updatedAtMs: Date.now(),
  }
}

/** Is the streak still "live" today or yesterday (vs. lapsed)? */
export function isStreakActive(streak: Streak | null, today: string): boolean {
  if (!streak) return false
  return streak.lastCallDate === today || streak.lastCallDate === etPrevDateKey(today)
}
