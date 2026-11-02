
import { NavLink } from 'react-router'

import drainIcon from '../../assets/icons/drain.svg'
import mapIcon from '../../assets/icons/map.svg'
import activityIcon from '../../assets/icons/activity.svg'
import bellIcon from '../../assets/icons/bell.svg'
import userIcon from '../../assets/icons/user.svg'

const NAV_ITEMS = [
  { label: '또랑이', path: '/my-drains', icon: drainIcon },
  { label: '지도', path: '/map', icon: mapIcon },
  { label: '소셜', path: '/social', icon: activityIcon },
  { label: '알림', path: '/notifications', icon: bellIcon },
  { label: '프로필', path: '/profile', icon: userIcon },
]

export default function BottomNavigation() {
  return (
    <nav
      aria-label="하단 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#EDF1F6] bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid h-[68px] max-w-[480px] grid-cols-5 items-center gap-1 px-3">
        {NAV_ITEMS.map(({ label, path, icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex h-[56px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3981F7] ${
                isActive
                  ? 'bg-[#EAF2FF] text-[#3981F7]'
                  : 'text-[#8C9AB0] hover:bg-[#F8FAFD]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden="true"
                  className="block h-6 w-6"
                  style={{
                    backgroundColor: isActive
                      ? '#3981F7'
                      : '#8C9AB0',
                    mask: `url("${icon}") center / contain no-repeat`,
                    WebkitMask: `url("${icon}") center / contain no-repeat`,
                  }}
                />
                <span className={`truncate text-[10px] leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
