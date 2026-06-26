/**
 * /digest — per-user email digest preferences plus a one-click brief refresh.
 * Gated by (protected)/_layout.tsx.
 */

import { useEffect, useState } from 'react'
import { Mail, RefreshCw, Clock } from 'lucide-react'
import { useUser } from 'deepspace'
import {
  Button,
  Switch,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Alert,
  AlertTitle,
  AlertDescription,
  useToast,
} from '../../components/ui'
import { usePreference, triggerBuildBrief } from '../../lib/useBrief'

export default function DigestPage() {
  const { user } = useUser()
  const { pref, save } = usePreference()
  const { success, error: toastError, info } = useToast()

  const [enabled, setEnabled] = useState(false)
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Seed local form from the saved preference / account email once it loads.
  useEffect(() => {
    if (hydrated) return
    if (pref) {
      setEnabled(pref.emailEnabled)
      setEmail(pref.email || user?.email || '')
      setHydrated(true)
    } else if (user) {
      setEmail(user.email ?? '')
      setHydrated(true)
    }
  }, [pref, user, hydrated])

  const emailValid = /.+@.+\..+/.test(email)

  async function handleSave() {
    if (enabled && !emailValid) {
      toastError('Enter a valid email', 'We need a destination address for the digest.')
      return
    }
    setSaving(true)
    try {
      await save({ emailEnabled: enabled, email })
      success(
        enabled ? 'Digest on' : 'Digest off',
        enabled ? `You'll get the brief at ${email} each morning.` : 'You will no longer receive the email digest.',
      )
    } catch (e) {
      toastError('Could not save', e instanceof Error ? e.message : 'Request failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    info('Building brief…', 'Pulling fresh odds and writing blurbs.')
    try {
      const res = await triggerBuildBrief()
      if (res.success) success('Brief updated', "Today's brief has been refreshed.")
      else toastError('Could not build brief', res.error ?? 'Unknown error')
    } catch (e) {
      toastError('Could not build brief', e instanceof Error ? e.message : 'Request failed')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Email digest</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Get Bellwether&apos;s brief — top movers, trending, and closing-soon markets —
          delivered each morning.
        </p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" aria-hidden />
              Morning digest
            </CardTitle>
            <CardDescription>Sent daily after the 6:30am ET brief is built.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
              <div>
                <div className="text-sm font-medium">Email me the daily brief</div>
                <div className="text-xs text-muted-foreground">Turn the digest on or off.</div>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Enable email digest" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="digest-email">Deliver to</Label>
              <Input
                id="digest-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!enabled}
              />
              {enabled && !emailValid && (
                <p className="text-xs text-rose-400">Enter a valid email address.</p>
              )}
            </div>

            <Button loading={saving} onClick={handleSave}>
              Save preferences
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" aria-hidden />
              Refresh the brief
            </CardTitle>
            <CardDescription>
              The brief rebuilds automatically every morning. Owners can rebuild it now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" loading={refreshing} onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              Rebuild today&apos;s brief
            </Button>
          </CardContent>
        </Card>

        <Alert className="mt-6">
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>
            Odds come from Polymarket and are informational only — not financial advice.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
