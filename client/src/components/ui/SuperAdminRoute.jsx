import { Navigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { Loader2 } from 'lucide-react'

/**
 * Route guard exclusivo para la Consola Maestra de SuperAdmin (/superadmin).
 * Si el usuario no está autenticado o no tiene rol de superadmin, lo redirige a /superadmin/login.
 */
export default function SuperAdminRoute({ children }) {
  const { isAuthenticated, isSuperAdmin, isLoading } = useApp()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <Loader2 className="w-8 h-8 text-beer-500 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated || !isSuperAdmin) {
    return <Navigate to="/superadmin/login" replace />
  }

  return children
}
