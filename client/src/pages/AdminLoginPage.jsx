import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'
import Logo from '@/components/ui/Logo'
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Admin Login Page
 * Route: /admin/login
 *
 * Uses Supabase Auth email+password.
 * On success → redirects to /admin/dashboard (or the original URL).
 */
function AdminLoginPage() {
  const { isAuthenticated } = useApp()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/admin/dashboard'

  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading]   = useState(false)

  // Already logged in → redirect
  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Por favor completa todos los campos')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      toast.success('¡Bienvenido al panel!')
    } catch (error) {
      toast.error(
        error.message === 'Invalid login credentials'
          ? 'Credenciales incorrectas'
          : 'Error al iniciar sesión'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-200 flex flex-col items-center justify-center p-6">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-beer-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <Logo size="lg" showTagline />
        </div>

        {/* Login card */}
        <div className="card p-6 shadow-beer">
          <h2 className="text-xl font-display font-bold text-white mb-1">
            Panel Administrativo
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Accede con tus credenciales de administrador
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tubar.com"
                  className="input-field pl-10"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10 pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Ingresando...</>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          BEER MUSIC © {new Date().getFullYear()} — Solo personal autorizado
        </p>
      </div>
    </div>
  )
}

export default AdminLoginPage
