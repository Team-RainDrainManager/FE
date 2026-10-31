import { Navigate, Route, Routes } from 'react-router'

import MainLayout from './layouts/MainLayout'
import MyDrainsPage from './pages/mydrains/MyDrainsPage'
import DrainDetailPage from './pages/drainDetail/DrainDetailPage'
import MapPage from './pages/map/MapPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={null} />

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

        <Route path="/map" element={<MapPage />} />
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