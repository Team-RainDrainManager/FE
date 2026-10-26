
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5EEF7] bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid h-[68px] max-w-[480px] grid-cols-5 items-center px-2">
        {NAV_ITEMS.map(({ label, path, icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex h-full flex-col items-center justify-center gap-1 rounded-xl transition-colors ${
                isActive
                  ? 'bg-[#EEF7FF] text-[#338CF0]'
                  : 'text-[#8D9AB0]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden="true"
                  className="block h-[22px] w-[22px]"
                  style={{
                    backgroundColor: isActive
                      ? '#338CF0'
                      : '#8D9AB0',
                    mask: `url("${icon}") center / contain no-repeat`,
                    WebkitMask: `url("${icon}") center / contain no-repeat`,
                  }}
                />
                <span className="text-[10px] font-medium">
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
