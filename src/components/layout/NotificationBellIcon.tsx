import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { apiClient } from '../../apis/axios-instance'
import { useAuthStore } from '../../store/useAuthStore'
import bellIcon from '../../assets/icons/bell.svg'

// Server unread summary only. No fake notification, automatic read API or push subscription.
const SEEN_KEY = 'ddorang:notification-bell-last-seen-count'

function readSeen(): number {
  try {
    const value = Number(window.sessionStorage.getItem(SEEN_KEY) ?? '0')
    return Number.isFinite(value) && value >= 0 ? value : 0
  } catch { return 0 }
}
function storeSeen(value: number) {
  try { window.sessionStorage.setItem(SEEN_KEY, String(value)) } catch { /* storage may be blocked */ }
}

function numericCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}
function getUnreadCount(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  // Multiple common spellings; if the backend schema changes, fail quietly rather than invent a count.
  for (const key of ['totalUnreadCount', 'total_unread_count', 'totalUnread', 'total_unread', 'unreadCount', 'unread_count', 'unread']) {
    const count = numericCount(v[key])
    if (count !== null) return count
  }
  const containers = ['unreadCounts', 'unread_counts', 'counts', 'byType', 'by_type']
  for (const key of containers) {
    const nested = v[key]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const vals = Object.values(nested as Record<string, unknown>)
      if (vals.length && vals.every(item => numericCount(item) !== null)) {
        return vals.reduce<number>((sum, item) => sum + (numericCount(item) ?? 0), 0)
      }
    }
  }
  return null
}

export default function NotificationBellIcon({ isActive }: { isActive: boolean }) {
  const { pathname } = useLocation()
  const [unread, setUnread] = useState<number | null>(null)
  const [seen, setSeen] = useState(readSeen)

  useEffect(() => {
    let mounted = true
    const refresh = async () => {
      try {
        const token = useAuthStore.getState().accessToken
        if (!token) return
        const response = await apiClient.get<unknown>('/api/v1/notifications/summary', { headers: { Authorization: `Bearer ${token}` } })
        const body = response.data as { success?: boolean; data?: unknown }
        if (body?.success === false) return
        const count = getUnreadCount(body?.data ?? response.data)
        if (count === null || !mounted) return
        setUnread(count)
        if (count === 0 || pathname === '/notifications') {
          const next = count === 0 ? 0 : count
          storeSeen(next)
          setSeen(next)
        }
      } catch {
        // Unavailable/unauthorized summary means: never claim a new notification.
      }
    }
    void refresh()
    const onFocus = () => { void refresh() }
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(() => { void refresh() }, 30000)
    return () => {
      mounted = false
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [pathname])

  const hasNew = pathname !== '/notifications' && unread !== null && unread > seen
  if (hasNew) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="block h-6 w-6" fill="none" stroke={isActive ? '#3981F7' : '#8C9AB0'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9Z" />
        <path d="M10 21h4M2.4 5.4l-1.4 2M21.6 5.4l1.4 2M4.7 2.8 3 4.2M19.3 2.8 21 4.2" />
      </svg>
    )
  }
  return (
    <span aria-hidden="true" className="block h-6 w-6" style={{
      backgroundColor: isActive ? '#3981F7' : '#8C9AB0',
      mask: `url("${bellIcon}") center / contain no-repeat`,
      WebkitMask: `url("${bellIcon}") center / contain no-repeat`,
    }} />
  )
}
