/** Client hook for the user's logged forecasts ("calls"). */

import { useCallback, useMemo } from 'react'
import { useQuery, useMutations, useAuth, getAuthToken } from 'deepspace'
import type { BriefMarket, Call, ForecasterStats } from '../types'
import { computeStats } from '../scoring'
import { useStreak } from './useStreak'

export interface LogCallInput {
  predictedProb: number
  note?: string
}

export interface CallsApi {
  calls: { recordId: string; data: Call }[]
  byMarket: Map<string, { recordId: string; data: Call }>
  stats: ForecasterStats
  canCall: boolean
  logCall: (market: BriefMarket, input: LogCallInput) => Promise<void>
  removeCall: (marketId: string) => Promise<void>
  loading: boolean
}

export function useCalls(): CallsApi {
  const { isSignedIn } = useAuth()
  const { records, status } = useQuery<Call>('calls')
  const { create, put, remove } = useMutations<Call>('calls')
  const { bumpToday } = useStreak()

  const calls = useMemo(() => records ?? [], [records])

  const byMarket = useMemo(() => {
    const m = new Map<string, { recordId: string; data: Call }>()
    for (const r of calls) m.set(r.data.marketId, r)
    return m
  }, [calls])

  const stats = useMemo(() => computeStats(calls.map((r) => r.data)), [calls])

  const logCall = useCallback(
    async (market: BriefMarket, input: LogCallInput) => {
      const existing = byMarket.get(market.marketId)
      const prob = Math.max(0.01, Math.min(0.99, input.predictedProb))
      if (existing) {
        // Only the prediction + note are editable while open.
        await put(existing.recordId, {
          predictedProb: prob,
          note: input.note ?? existing.data.note ?? '',
        } as Partial<Call>)
        return
      }
      await create({
        marketId: market.marketId,
        question: market.question,
        slug: market.slug,
        image: market.image,
        topic: market.topic,
        eventTitle: market.eventTitle,
        outcomes: market.outcomes,
        endDate: market.endDate,
        predictedProb: prob,
        marketProbAtCall: market.yesPrice,
        note: input.note ?? '',
        createdAtMs: Date.now(),
        status: 'open',
        resolvedOutcome: null,
        resolvedAt: null,
        brier: null,
        marketBrier: null,
        beatMarket: null,
      } as Call)
      // Logging a new call counts toward today's streak.
      await bumpToday()
    },
    [byMarket, create, put, bumpToday],
  )

  const removeCall = useCallback(
    async (marketId: string) => {
      const existing = byMarket.get(marketId)
      if (existing) await remove(existing.recordId)
    },
    [byMarket, remove],
  )

  return {
    calls,
    byMarket,
    stats,
    canCall: isSignedIn,
    logCall,
    removeCall,
    loading: status === 'loading',
  }
}

/** Trigger the resolveCalls action (signed-in) to pull in fresh results. */
export async function triggerResolveCalls(): Promise<{
  success: boolean
  error?: string
  data?: { resolved: number }
}> {
  const res = await fetch('/api/actions/resolveCalls', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getAuthToken()}`,
    },
    body: JSON.stringify({}),
  })
  return res.json()
}
