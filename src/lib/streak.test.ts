import { describe, it, expect } from 'vitest'
import { nextStreak, isStreakActive } from './streak'
import type { Streak } from '../types'

function streak(p: Partial<Streak>): Streak {
  return { userId: 'u', currentStreak: 1, longestStreak: 1, lastCallDate: '2026-06-01', updatedAtMs: 0, ...p }
}

describe('nextStreak', () => {
  it('starts a streak from nothing', () => {
    const patch = nextStreak(null, '2026-06-10')
    expect(patch).toMatchObject({ currentStreak: 1, longestStreak: 1, lastCallDate: '2026-06-10' })
  })

  it('is a no-op if already counted today', () => {
    expect(nextStreak(streak({ lastCallDate: '2026-06-10' }), '2026-06-10')).toBeNull()
  })

  it('continues when the last call was yesterday', () => {
    const patch = nextStreak(streak({ currentStreak: 3, longestStreak: 3, lastCallDate: '2026-06-09' }), '2026-06-10')
    expect(patch).toMatchObject({ currentStreak: 4, longestStreak: 4 })
  })

  it('resets when a day was missed, keeping the best', () => {
    const patch = nextStreak(streak({ currentStreak: 5, longestStreak: 9, lastCallDate: '2026-06-07' }), '2026-06-10')
    expect(patch).toMatchObject({ currentStreak: 1, longestStreak: 9 })
  })
})

describe('isStreakActive', () => {
  it('is active today or yesterday', () => {
    expect(isStreakActive(streak({ lastCallDate: '2026-06-10' }), '2026-06-10')).toBe(true)
    expect(isStreakActive(streak({ lastCallDate: '2026-06-09' }), '2026-06-10')).toBe(true)
  })
  it('is lapsed after a gap', () => {
    expect(isStreakActive(streak({ lastCallDate: '2026-06-07' }), '2026-06-10')).toBe(false)
    expect(isStreakActive(null, '2026-06-10')).toBe(false)
  })
})
