import bellIcon from '../../assets/icons/tab-bell.png'
import './notification-bell.css'

export default function NotificationBellIcon({ isActive, ringing }: { isActive: boolean; ringing: boolean }) {
  const mask = `url("${bellIcon}") center / contain no-repeat`
  return (
    <span aria-hidden="true" className="relative block h-6 w-6" style={{ color: isActive ? '#3981F7' : '#8C9AB0' }}>
      <span className="absolute inset-0" style={{ backgroundColor: 'currentColor', mask, WebkitMask: mask }} />
      {ringing && (
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round">
          <g className="dd-bell-inner">
            {[undefined, 'translate(24 0) scale(-1 1)'].map((transform, i) => (
              <path key={i} transform={transform} d="M2.6 7.5q-2 3 0 6" />
            ))}
          </g>
          <g className="dd-bell-outer">
            {[undefined, 'translate(24 0) scale(-1 1)'].map((transform, i) => (
              <path key={i} transform={transform} d="M-.3 5.4q-3.6 5.1 0 10.2" />
            ))}
          </g>
        </svg>
      )}
    </span>
  )
}
