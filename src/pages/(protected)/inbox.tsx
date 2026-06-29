/** /inbox — full notification history (resolution recaps + swing alerts). */

import { Link } from 'react-router-dom'
import { Bell, Trophy, TrendingUp, CheckCheck } from 'lucide-react'
import { Button, EmptyState } from '../../components/ui'
import { useNotifications } from '../../lib/useNotifications'
import type { AppNotification } from '../../types'
import { cn } from '../../components/ui/utils'

const POLYMARKET_BASE = 'https://polymarket.com/market/'

export default function InboxPage() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight">Inbox</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Resolution recaps and alerts for the markets you follow.
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => void markAllRead()}>
              <CheckCheck className="mr-2 h-4 w-4" aria-hidden />
              Mark all read
            </Button>
          )}
        </div>

        <div className="mt-8">
          {notifications.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-6 w-6" />}
              title="No notifications yet"
              description="When your calls resolve or a market you follow swings sharply, it'll show up here."
              action={{ label: 'Go to the brief', onClick: () => (window.location.href = '/home') }}
            />
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <Row key={n.recordId} n={n.data} onRead={() => !n.data.read && markRead(n.recordId)} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ n, onRead }: { n: AppNotification; onRead: () => void }) {
  const Icon = n.type === 'resolution' ? Trophy : TrendingUp
  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3',
        !n.read && 'border-primary/30 bg-primary/5',
      )}
      onMouseEnter={onRead}
    >
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{n.title}</span>
          {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{new Date(n.createdAtMs).toLocaleString()}</span>
          {n.slug && (
            <a
              href={`${POLYMARKET_BASE}${n.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              View market
            </a>
          )}
          <Link to="/scorecard" className="text-primary hover:underline">
            Scorecard
          </Link>
        </div>
      </div>
    </li>
  )
}
