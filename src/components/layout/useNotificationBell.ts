import { useQuery } from '@tanstack/react-query'
import { create } from 'zustand'
import { getNotifications } from '../../apis/notifications'
import { parseServerDateTime } from '../../utils/kstDateTime'
import { useAuthStore } from '../../store/useAuthStore'

// The unread endpoint returns newest first, with notification IDs as cursors.
// Keeping the dismissal in memory preserves it across routes but resets on a cold start.
const useDismissal = create(() => ({ throughId: 0, tappedAt: 0, login: 0 }))
useAuthStore.subscribe((next, previous) => {
  if (Boolean(next.accessToken) !== Boolean(previous.accessToken)) {
    useDismissal.setState(state => ({ throughId: 0, tappedAt: 0, login: state.login + 1 }))
  }
})

export function useNotificationBell() {
  const signedIn = useAuthStore(state => Boolean(state.accessToken))
  const { throughId, tappedAt, login } = useDismissal()
  const { data } = useQuery({
    queryKey: ['notifications-list', 'bell-latest-unread', login],
    queryFn: async ({ signal }) => {
      const page = await getNotifications({ unread: true, size: 1 }, signal)
      return page.notifications.find(item => !item.read) ?? null
    },
    enabled: signedIn,
    refetchInterval: 30_000,
    refetchOnWindowFocus: 'always',
  })

  function dismiss() {
    useDismissal.setState({
      throughId: Math.max(throughId, data?.notificationId ?? 0),
      // Covers an initial request that has not returned when the tab is tapped.
      tappedAt: data ? 0 : Date.now(),
    })
  }

  const ringing = Boolean(signedIn && data && data.notificationId > throughId &&
    (tappedAt === 0 || (parseServerDateTime(data.createdAt)?.getTime() ?? 0) > tappedAt))
  return { ringing, dismiss }
}
