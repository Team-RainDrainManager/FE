
import { Outlet, useLocation } from 'react-router'

import Header from '../components/layout/Header'
import BottomNavigation from '../components/layout/BottomNavigation'

export default function MainLayout() {
  const { pathname } = useLocation()

  const isDetailPage = /^\/drains\/[^/]+$/.test(pathname)

  return (
    <div className="min-h-dvh bg-[#F5FAFF]">
      <div className="mx-auto min-h-dvh max-w-[480px] bg-white shadow-sm">
        <Header />

        <main
          className={
            isDetailPage
              ? 'min-h-0 pb-6'
              : 'min-h-0 pb-[calc(68px+env(safe-area-inset-bottom))]'
          }
        >
          <Outlet />
        </main>

        {!isDetailPage && <BottomNavigation />}
      </div>
    </div>
  )
}
