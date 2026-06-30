/** Left sidebar navigation (desktop) + compact bar/drawer (mobile). */

import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthOverlay, useAuthProfileReady, signOut } from 'deepspace'
import {
  Newspaper,
  Coffee,
  Target,
  Trophy,
  Mail,
  Inbox as InboxIcon,
  Activity,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react'
import { type Role } from '../constants'
import { nav } from '../nav'
import { Skeleton } from './ui'
import { cn } from './ui/utils'
import { useNotifications } from '../lib/useNotifications'

const ICONS: Record<string, LucideIcon> = {
  '/edition': Coffee,
  '/home': Newspaper,
  '/daily': Target,
  '/scorecard': Trophy,
  '/inbox': InboxIcon,
  '/email': Mail,
  '/api-status': Activity,
}

export default function Navigation() {
  const { isLoaded, isSignedIn, user, userLoading } = useAuthProfileReady({ requireUser: true })
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { unreadCount } = useNotifications()

  const profileReady = !isSignedIn || (!userLoading && !!user)
  const userRole = (user?.role ?? 'anonymous') as Role | 'anonymous'

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  const visibleNav = nav.filter((item) => {
    if (item.devOnly && !import.meta.env.DEV) return false
    if (!item.roles) return true
    if (!profileReady) return false
    if (userRole === 'admin') return true
    return item.roles.includes(userRole as Role)
  })

  const links = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-0.5">
      {visibleNav.map((item) => {
        const active =
          item.path === '/home'
            ? location.pathname === '/home' || location.pathname === '/'
            : location.pathname.startsWith(item.path)
        const Icon = ICONS[item.path] ?? Newspaper
        const showBadge = item.path === '/inbox' && unreadCount > 0
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[0.9rem] transition-colors',
              active
                ? 'bg-secondary/70 font-medium text-foreground'
                : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground',
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
            )}
            <Icon
              className={cn('h-[1.05rem] w-[1.05rem] shrink-0', active ? 'text-primary' : '')}
              aria-hidden
            />
            <span className="flex-1">{item.label}</span>
            {showBadge && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )

  const wordmark = (
    <Link to="/home" className="flex shrink-0 items-center gap-2.5">
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
        <span className="absolute h-2.5 w-2.5 rounded-full bg-primary/40 blur-[3px]" />
      </span>
      <span className="font-serif text-[1.35rem] font-semibold leading-none tracking-tight text-foreground">
        Bellwether
      </span>
    </Link>
  )

  const account = (
    <div className="border-t border-border pt-3">
      {!isLoaded || (isSignedIn && !profileReady) ? (
        <div className="flex items-center gap-2 px-1">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ) : isSignedIn && user ? (
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-border">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              (user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div data-testid="nav-user-name" className="truncate text-sm font-medium text-foreground">
              {user.name || 'Signed in'}
            </div>
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
          </div>
          <button
            onClick={() => signOut()}
            aria-label="Sign out"
            title="Sign out"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          data-testid="nav-sign-in-button"
          onClick={() => setShowAuthModal(true)}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Sign in
        </button>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        data-testid="app-navigation"
        className="hidden w-60 shrink-0 flex-col border-r border-border bg-background/60 px-3 py-5 lg:flex"
      >
        <div className="px-2">{wordmark}</div>
        <div className="mt-7 flex-1 overflow-y-auto">{links()}</div>
        {account}
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:hidden">
        {wordmark}
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border bg-background px-3 py-5">
            <div className="flex items-center justify-between px-2">
              {wordmark}
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="mt-7 flex-1 overflow-y-auto">{links(() => setDrawerOpen(false))}</div>
            {account}
          </div>
        </div>
      )}

      {showAuthModal && <AuthOverlay onClose={() => setShowAuthModal(false)} />}
    </>
  )
}
