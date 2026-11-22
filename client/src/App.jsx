import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from '@/context/AppContext'

// Pages
import LandingPage from '@/pages/LandingPage'
import ClientPage from '@/pages/ClientPage'
import PlayerPage from '@/pages/PlayerPage'
import AdminLoginPage from '@/pages/AdminLoginPage'
import AdminDashboardPage from '@/pages/AdminDashboardPage'
import NotFoundPage from '@/pages/NotFoundPage'

// Guards
import ProtectedRoute from '@/components/ui/ProtectedRoute'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { useApp } from '@/context/AppContext'

function PlayerDefaultRedirect() {
  const { business } = useApp()
  const targetSlug = business?.slug || 'tu-kva'
  return <Navigate to={`/player/${targetSlug}`} replace />
}

/**
 * CJ SYSTEMS - Main App Router (Multi-Tenant SaaS)
 *
 * Routes:
 *   /                              → Landing Page Comercial (CJ Systems - Ing. Ciro José)
 *   /:businessSlug/table/:qrToken  → Client interface (mobile, via QR)
 *   /player/:businessSlug          → Central music player (connected to sound system)
 *   /admin/login                   → Admin authentication
 *   /admin/dashboard               → Protected admin & CJ Systems SuperAdmin panel
 */
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
        <Routes>
          {/* Landing Page Comercial de CJ Systems */}
          <Route path="/" element={<LandingPage />} />

          {/* Client interface - accessed via QR code */}
          <Route
            path="/:businessSlug/table/:qrToken"
            element={<ClientPage />}
          />

          {/* Central music player - solo accesible si se ha iniciado sesión en el Dashboard */}
          <Route
            path="/player"
            element={
              <ProtectedRoute>
                <PlayerDefaultRedirect />
              </ProtectedRoute>
            }
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

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
