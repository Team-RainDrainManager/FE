import { useLocation } from 'react-router'
import Header from '../components/layout/Header'
import BottomNavigation from '../components/layout/BottomNavigation'
import SwipeTabOutlet from '../components/layout/SwipeTabOutlet'
import FirstTimeTour from '../components/FirstTimeTour'

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
          <SwipeTabOutlet />
        </main>

        {!isDetailPage && <BottomNavigation />}
        <FirstTimeTour />
      </div>
    </div>
  )
}
