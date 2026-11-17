import bellIcon from '../../assets/icons/tab-bell.png'
import './notification-bell.css'

export default function NotificationBellIcon({ isActive, ringing }: { isActive: boolean; ringing: boolean }) {
  const mask = `url("${bellIcon}") center / contain no-repeat`
  return (
    <span aria-hidden="true" className="relative block h-6 w-6" style={{ color: isActive ? '#3981F7' : '#8C9AB0' }}>
      <span className="absolute inset-0" style={{ backgroundColor: 'currentColor', mask, WebkitMask: mask }} />
      {ringing && (
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round">
          <path className="dd-bell-inner" d="M3.6 7.5q-2 3 0 6M20.4 7.5q2 3 0 6" />
          <path className="dd-bell-outer" d="M0.7 5.4q-3.6 5.1 0 10.2M23.3 5.4q3.6 5.1 0 10.2" />
        </svg>
      )}
    </span>
  )
}
