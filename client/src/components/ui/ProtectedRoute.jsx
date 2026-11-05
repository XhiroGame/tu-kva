import { Navigate, useLocation } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { Loader2 } from 'lucide-react'

/**
 * Route guard for admin-only pages.
 * Redirects to /admin/login if no active session.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useApp()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-200">
        <Loader2 className="w-8 h-8 text-beer-500 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        state={{ from: location }}
        replace
      />
    )
  }

  return children
}

export default ProtectedRoute
