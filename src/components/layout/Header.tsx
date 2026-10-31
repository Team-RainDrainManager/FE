
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

  // 설정 및 빗물받이 상세 페이지 확인
  const isSettingsPage = pathname === '/settings'
  const isDetailPage = /^\/drains\/[^/]+$/.test(pathname)

  // 페이지 제목
  const title = isDetailPage
    ? '빗물받이 상세'
    : PAGE_TITLES[pathname] ?? '또랑'

  // 뒤로 가기 버튼 표시 여부
  const showBackButton = isSettingsPage || isDetailPage

  return (
    <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center justify-between border-b border-[#EDF1F6] bg-white px-5">
      <div className="flex min-w-0 items-center gap-2">
        {showBackButton && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="뒤로 가기"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#203451] transition-colors hover:bg-[#F3F6FA] active:bg-[#EAF2FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3981F7]"
          >
            <span
              aria-hidden="true"
              className="block h-[22px] w-[22px] bg-current"
              style={{
                mask: `url("${backIcon}") center / contain no-repeat`,
                WebkitMask: `url("${backIcon}") center / contain no-repeat`,
              }}
            />
          </button>
        )}

        <h1
          className={
            isDetailPage
              ? 'pointer-events-none absolute inset-x-[64px] top-0 flex h-[60px] items-center justify-center text-xl font-bold tracking-tight text-[#203451]'
              : 'truncate text-xl font-bold tracking-tight text-[#203451]'
          }
        >
          <span className="truncate">{title}</span>
        </h1>
      </div>

      {!showBackButton && (
        <Link
          to="/settings"
          aria-label="설정"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#203451] transition-colors hover:bg-[#F3F6FA] active:bg-[#EAF2FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3981F7]"
        >
          <span
              aria-hidden="true"
              className="block h-[22px] w-[22px] bg-current"
              style={{
                mask: `url("${gearIcon}") center / contain no-repeat`,
                WebkitMask: `url("${gearIcon}") center / contain no-repeat`,
              }}
            />
        </Link>
      )}
    </header>
  )
}
