import { useNavigate } from 'react-router-dom'
import { Bell, Trophy, TrendingUp, CheckCheck } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from './ui'
import { useNotifications } from '../lib/useNotifications'
import type { AppNotification } from '../types'
import { cn } from './ui/utils'

/** Nav notification bell — unread badge + a dropdown of recent items. */
export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const navigate = useNavigate()
  const recent = notifications.slice(0, 6)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          className="relative rounded-full border border-border bg-card/60 p-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              Mark all read
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            No notifications yet. Follow markets and log calls to get updates here.
          </div>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {recent.map((n) => (
              <NotificationItem
                key={n.recordId}
                n={n.data}
                onClick={() => {
                  if (!n.data.read) void markRead(n.recordId)
                  navigate('/inbox')
                }}
              />
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => navigate('/inbox')}
          className="block w-full border-t border-border px-3 py-2 text-center text-sm font-medium text-primary hover:bg-secondary/40"
        >
          See all
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationItem({ n, onClick }: { n: AppNotification; onClick: () => void }) {
  const Icon = n.type === 'resolution' ? Trophy : TrendingUp
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-secondary/40',
          !n.read && 'bg-primary/5',
        )}
      >
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{n.title}</span>
            {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>
        </span>
      </button>
    </li>
  )
}
