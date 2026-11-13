import { Outlet, useLocation } from 'react-router'
import Header from '../components/layout/Header'
import BottomNavigation from '../components/layout/BottomNavigation'
import TabOutlet from '../components/layout/TabOutlet'
import FirstTimeTour from '../components/FirstTimeTour'
import CareWarningGate from '../features/care/CareWarningGate'

export default function MainLayout() {
  const { pathname } = useLocation()
  const isDetailPage = /^\/drains\/[^/]+\/?$/.test(pathname)

  return (
    <div className="min-h-dvh bg-[#F5FAFF]">
      <div
        className={`mx-auto max-w-[480px] bg-white shadow-sm ${
          isDetailPage
            ? 'flex h-dvh flex-col overflow-hidden'
            : 'min-h-dvh overflow-x-clip'
        }`}
      >
        {isDetailPage ? (
          <div className="shrink-0">
            <Header />
          </div>
        ) : (
          <Header />
        )}

        <main
          className={
            isDetailPage
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'min-h-0 pb-[calc(68px+env(safe-area-inset-bottom))]'
          }
        >
          {isDetailPage ? <Outlet /> : <TabOutlet />}
        </main>

        {!isDetailPage && <BottomNavigation />}
        <FirstTimeTour />
        <CareWarningGate />
      </div>
    </div>
  )
}