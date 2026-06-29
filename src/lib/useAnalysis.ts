/** Client hook for the AI Analyst — read cached analysis, or generate one. */

import { useCallback, useMemo, useState } from 'react'
import { useQuery, getAuthToken } from 'deepspace'
import type { BriefMarket, MarketAnalysis } from '../types'
import { etDateKey } from './date'

export function useAnalysis(market: BriefMarket): {
  analysis: MarketAnalysis | null
  isFresh: boolean
  generating: boolean
  error: string | null
  generate: () => Promise<void>
} {
  const { records } = useQuery<MarketAnalysis>('analyses')
  const [generated, setGenerated] = useState<MarketAnalysis | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cached = useMemo(() => {
    const row = (records ?? []).find((r) => r.data.marketId === market.marketId)
    return row?.data ?? null
  }, [records, market.marketId])

  const analysis = generated ?? cached
  const isFresh = !!analysis && analysis.date === etDateKey()

  const generate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/actions/analyzeMarket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          marketId: market.marketId,
          question: market.question,
          eventTitle: market.eventTitle,
          topic: market.topic,
          yesPrice: market.yesPrice,
        }),
      })
      const json = (await res.json()) as {
        success: boolean
        data?: MarketAnalysis
        error?: string
      }
      if (json.success && json.data) setGenerated(json.data)
      else setError(json.error ?? 'Failed to generate analysis')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setGenerating(false)
    }
  }, [market])

  return { analysis, isFresh, generating, error, generate }
}
