import { describe, it, expect } from 'vitest'
import { brier, brierToSkill, isCorrect, computeStats } from './scoring'
import type { Call } from './types'

function makeCall(p: Partial<Call>): Call {
  return {
    userId: 'u1',
    marketId: 'm1',
    question: 'Q?',
    slug: 's',
    image: '',
    topic: 'politics',
    eventTitle: 'E',
    outcomes: ['Yes', 'No'],
    endDate: null,
    predictedProb: 0.5,
    marketProbAtCall: 0.5,
    note: '',
    createdAtMs: 0,
    status: 'open',
    resolvedOutcome: null,
    resolvedAt: null,
    brier: null,
    marketBrier: null,
    beatMarket: null,
    ...p,
  }
}

/** A resolved call with consistent brier fields derived from inputs. */
function resolved(predictedProb: number, marketProb: number, outcome: number, topic = 'politics'): Call {
  const b = brier(predictedProb, outcome)
  const mb = brier(marketProb, outcome)
  return makeCall({
    predictedProb,
    marketProbAtCall: marketProb,
    topic,
    status: 'resolved',
    resolvedOutcome: outcome,
    resolvedAt: 1,
    brier: b,
    marketBrier: mb,
    beatMarket: b < mb,
  })
}

describe('brier + skill', () => {
  it('rewards confident correct calls', () => {
    expect(brier(0.9, 1)).toBeCloseTo(0.01)
    expect(brier(0.1, 0)).toBeCloseTo(0.01)
  })
  it('punishes confident wrong calls', () => {
    expect(brier(0.9, 0)).toBeCloseTo(0.81)
  })
  it('coin flip is 0.25', () => {
    expect(brier(0.5, 1)).toBeCloseTo(0.25)
  })
  it('maps brier to a 0..100 skill score', () => {
    expect(brierToSkill(0)).toBe(100)
    expect(brierToSkill(0.25)).toBe(50)
    expect(brierToSkill(1)).toBe(0)
  })
})

describe('isCorrect', () => {
  it('counts a lean that matched reality', () => {
    expect(isCorrect(0.7, 1)).toBe(true)
    expect(isCorrect(0.3, 0)).toBe(true)
  })
  it('counts a lean that missed', () => {
    expect(isCorrect(0.7, 0)).toBe(false)
  })
  it('does not credit a 50/50 call', () => {
    expect(isCorrect(0.5, 1)).toBe(false)
  })
})

describe('computeStats', () => {
  it('handles no resolved calls', () => {
    const s = computeStats([makeCall({}), makeCall({})])
    expect(s.total).toBe(2)
    expect(s.open).toBe(2)
    expect(s.resolved).toBe(0)
    expect(s.accuracy).toBe(0)
  })

  it('computes accuracy, beat-market, and skill', () => {
    const calls = [
      resolved(0.9, 0.6, 1), // correct, beats market
      resolved(0.8, 0.7, 1), // correct, beats market
      resolved(0.7, 0.55, 0), // wrong; market also wrong but closer
    ]
    const s = computeStats(calls)
    expect(s.resolved).toBe(3)
    expect(s.accuracy).toBeCloseTo(2 / 3)
    expect(s.beatMarketRate).toBeCloseTo(2 / 3)
    expect(s.skillScore).toBeGreaterThan(0)
    expect(s.meanBrier).toBeGreaterThan(0)
  })

  it('buckets calibration and breaks down by category', () => {
    const calls = [
      resolved(0.9, 0.5, 1, 'sports'),
      resolved(0.95, 0.5, 1, 'sports'),
      resolved(0.2, 0.5, 0, 'econ'),
    ]
    const s = computeStats(calls)
    expect(s.calibration.length).toBeGreaterThanOrEqual(2)
    const sports = s.byCategory.find((c) => c.topic === 'sports')
    expect(sports?.resolved).toBe(2)
    expect(sports?.accuracy).toBe(1)
  })
})
