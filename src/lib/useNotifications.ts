/** Client hook for the user's notifications (recaps + swing alerts). */

import { useCallback, useMemo } from 'react'
import { useQuery, useMutations } from 'deepspace'
import type { AppNotification } from '../types'

export function useNotifications(): {
  notifications: { recordId: string; data: AppNotification }[]
  unreadCount: number
  markRead: (recordId: string) => Promise<void>
  markAllRead: () => Promise<void>
} {
  const { records } = useQuery<AppNotification>('notifications')
  const { put } = useMutations<AppNotification>('notifications')

  const notifications = useMemo(
    () => [...(records ?? [])].sort((a, b) => b.data.createdAtMs - a.data.createdAtMs),
    [records],
  )

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.data.read).length,
    [notifications],
  )

  const markRead = useCallback(
    async (recordId: string) => {
      await put(recordId, { read: true } as Partial<AppNotification>)
    },
    [put],
  )

  const markAllRead = useCallback(async () => {
    await Promise.all(
      notifications.filter((n) => !n.data.read).map((n) => put(n.recordId, { read: true } as Partial<AppNotification>)),
    )
  }, [notifications, put])

  return { notifications, unreadCount, markRead, markAllRead }
}
