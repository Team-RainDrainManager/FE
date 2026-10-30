
import { Navigate, Route, Routes } from 'react-router'

import MainLayout from './layouts/MainLayout'
import MyDrainsPage from './pages/mydrains/MyDrainsPage'
import DrainDetailPage from './pages/drainDetail/DrainDetailPage'

export default function App() {
  return (
    <Routes>
      {/* 로그인 */}
      <Route path="/login" element={null} />

      {/* 공통 레이아웃 */}
      <Route element={<MainLayout />}>
        <Route path="/" element={null} />

        <Route
          path="/my-drains"
          element={<MyDrainsPage />}
        />
        <Route
          path="/drains/:drainId"
          element={<DrainDetailPage />}
        />  

        <Route path="/map" element={null} />
        <Route path="/social" element={null} />
        <Route path="/notifications" element={null} />
        <Route path="/profile" element={null} />
        <Route path="/settings" element={null} />
      </Route>

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}
