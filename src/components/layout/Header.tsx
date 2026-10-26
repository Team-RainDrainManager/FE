
import { Link, useLocation, useNavigate } from 'react-router'

import backIcon from '../../assets/icons/back.svg'
import gearIcon from '../../assets/icons/gear.svg'

const PAGE_TITLES: Record<string, string> = {
  '/my-drains': '또랑이',
  '/map': '지도',
  '/social': '소셜',
  '/notifications': '알림',
  '/profile': '프로필',
  '/settings': '설정',
}

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const title = PAGE_TITLES[pathname] ?? '또랑'
  const isSettingsPage = pathname === '/settings'

  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-[#E5EEF7] bg-white px-5">
      <div className="flex min-w-0 items-center gap-2">
        {isSettingsPage && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="뒤로 가기"
            className="flex h-10 w-10 items-center justify-center"
          >
            <img
              src={backIcon}
              alt=""
              className="h-[22px] w-[22px]"
            />
          </button>
        )}

        <h1 className="truncate text-xl font-bold text-[#24496B]">
          {title}
        </h1>
      </div>

      {!isSettingsPage && (
        <Link
          to="/settings"
          aria-label="설정"
          className="flex h-10 w-10 items-center justify-center"
        >
          <img
            src={gearIcon}
            alt=""
            className="h-[22px] w-[22px]"
          />
        </Link>
      )}
    </header>
  )
}
