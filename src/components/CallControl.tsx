import { useState } from 'react'
import { Target, Pencil, TrendingUp, TrendingDown } from 'lucide-react'
import { Modal, Button, Input, Label, useToast } from './ui'
import { useCalls } from '../lib/useCalls'
import type { BriefMarket, Call } from '../types'
import { formatPct } from '../lib/format'
import { cn } from './ui/utils'

/** In-card forecasting control: shows your call (or a prompt to make one). */
export default function CallControl({ market }: { market: BriefMarket }) {
  const { canCall, byMarket, logCall, removeCall } = useCalls()
  const existing = byMarket.get(market.marketId)?.data ?? null
  const [open, setOpen] = useState(false)

  if (!canCall) {
    return (
      <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        Sign in to log your forecast.
      </div>
    )
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      {existing ? (
        <CallSummary market={market} call={existing} onEdit={() => setOpen(true)} />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Target className="h-4 w-4" aria-hidden />
          Make your call
        </button>
      )}

      {open && (
        <CallDialog
          market={market}
          existing={existing}
          onClose={() => setOpen(false)}
          onSubmit={async (prob, note) => {
            await logCall(market, { predictedProb: prob, note })
            setOpen(false)
          }}
          onRemove={
            existing
              ? async () => {
                  await removeCall(market.marketId)
                  setOpen(false)
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

function CallSummary({
  market,
  call,
  onEdit,
}: {
  market: BriefMarket
  call: Call
  onEdit: () => void
}) {
  const edge = call.predictedProb - market.yesPrice
  const up = edge > 0.005
  const down = edge < -0.005
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 font-semibold text-primary">
          <Target className="h-3.5 w-3.5" aria-hidden />
          Your call: {formatPct(call.predictedProb)}
        </span>
        {(up || down) && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium',
              up ? 'text-emerald-400' : 'text-rose-400',
            )}
            title="Your edge vs the current market price"
          >
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {up ? '+' : '−'}
            {Math.abs(edge * 100).toFixed(0)} vs mkt
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit your call"
        className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function CallDialog({
  market,
  existing,
  onClose,
  onSubmit,
  onRemove,
}: {
  market: BriefMarket
  existing: Call | null
  onClose: () => void
  onSubmit: (prob: number, note: string) => Promise<void>
  onRemove?: () => Promise<void>
}) {
  const { success, error: toastError } = useToast()
  const [pct, setPct] = useState(Math.round((existing?.predictedProb ?? market.yesPrice) * 100))
  const [note, setNote] = useState(existing?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const primary = market.outcomes[0] ?? 'Yes'
  const secondary = market.outcomes[1] ?? 'No'
  const marketPct = Math.round(market.yesPrice * 100)
  const lean = pct > 50 ? primary : pct < 50 ? secondary : 'Toss-up'

  async function handleSave() {
    setSaving(true)
    try {
      await onSubmit(pct / 100, note.trim())
      success('Call logged', `You predicted ${pct}% ${primary}. We'll score it when it resolves.`)
    } catch (e) {
      toastError('Could not log call', e instanceof Error ? e.message : 'Request failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!onRemove) return
    setRemoving(true)
    try {
      await onRemove()
      success('Call removed', 'Your forecast was deleted.')
    } catch (e) {
      toastError('Could not remove call', e instanceof Error ? e.message : 'Request failed')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="md">
      <Modal.Header>
        <Modal.Title>{existing ? 'Edit your call' : 'Make your call'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-sm font-medium leading-snug text-foreground">{market.question}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Market currently prices {primary} at {marketPct}%.
        </p>

        <div className="mt-6 text-center">
          <div className="text-5xl font-bold tabular-nums tracking-tight text-foreground">
            {pct}%
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            chance of <span className="font-medium text-foreground">{primary}</span>
            {' · '}you lean{' '}
            <span className="font-medium text-foreground">{lean}</span>
          </div>
        </div>

        <input
          type="range"
          min={1}
          max={99}
          step={1}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          aria-label="Your probability"
          className="mt-5 w-full accent-[var(--color-primary)]"
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{secondary}</span>
          <span>Market {marketPct}%</span>
          <span>{primary}</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[10, 25, 50, 75, 90].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setPct(v)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                pct === v
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {v}%
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-2">
          <Label htmlFor="call-note">Your reasoning (optional)</Label>
          <Input
            id="call-note"
            placeholder="Why? e.g. recent form, polls, news…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        {onRemove && (
          <Button variant="ghost" className="text-rose-400 hover:text-rose-300" loading={removing} onClick={handleRemove}>
            Remove
          </Button>
        )}
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button loading={saving} onClick={handleSave}>
          {existing ? 'Update call' : 'Log call'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
