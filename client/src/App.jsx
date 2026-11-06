import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from '@/context/AppContext'

// Pages
import ClientPage from '@/pages/ClientPage'
import PlayerPage from '@/pages/PlayerPage'
import AdminLoginPage from '@/pages/AdminLoginPage'
import AdminDashboardPage from '@/pages/AdminDashboardPage'
import NotFoundPage from '@/pages/NotFoundPage'

// Guards
import ProtectedRoute from '@/components/ui/ProtectedRoute'

/**
 * BEER MUSIC - Main App Router
 *
 * Routes:
 *   /                              → Redirect to default business or landing
 *   /:businessSlug/table/:qrToken  → Client interface (mobile, via QR)
 *   /player/:businessSlug          → Central music player (connected to sound system)
 *   /admin/login                   → Admin authentication
 *   /admin/dashboard               → Protected admin panel
 *   /admin/tables                  → Table & QR management
 *   /admin/history                 → Play history
 */
function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          {/* Client interface - accessed via QR code */}
          <Route
            path="/:businessSlug/table/:qrToken"
            element={<ClientPage />}
          />

          {/* Central music player - solo accesible si se ha iniciado sesión en el Dashboard */}
          <Route
            path="/player"
            element={<Navigate to="/player/tu-kva" replace />}
          />
          <Route
            path="/player/:businessSlug"
            element={
              <ProtectedRoute>
                <PlayerPage />
              </ProtectedRoute>
            }
          />

          {/* Admin authentication */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Protected admin routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route
            path="/"
            element={<Navigate to="/admin/login" replace />}
          />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
