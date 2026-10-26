
import { Outlet } from 'react-router'

import Header from '../components/layout/Header'
import BottomNavigation from '../components/layout/BottomNavigation'

export default function MainLayout() {
  return (
    <div className="min-h-dvh bg-[#F5FAFF]">
      <div className="mx-auto min-h-dvh max-w-[480px] bg-white shadow-sm">
        <Header />

        <main className="min-h-0 pb-[calc(68px+env(safe-area-inset-bottom))]">
          <Outlet />
        </main>

        <BottomNavigation />
      </div>
    </div>
  )
}
