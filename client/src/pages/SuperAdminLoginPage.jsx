import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'
import { ShieldCheck, Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Portal de Acceso Exclusivo para SuperAdmin — CJ Systems (Ing. Ciro José)
 * Route: /superadmin/login
 */
export default function SuperAdminLoginPage() {
  const { isAuthenticated, isSuperAdmin, isLoading: authLoading, signOut } = useApp()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  if (!authLoading && isAuthenticated && isSuperAdmin) {
    return <Navigate to="/superadmin" replace />
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
      toast.success('¡Bienvenido a la Consola Maestra de CJ Systems!')
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
    <div className="relative min-h-screen bg-dark-950 flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-beer-500/10 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Identidad CJ Systems */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-beer-gradient flex items-center justify-center text-dark-200 font-display font-black text-2xl shadow-beer-lg mb-3">
            CJ
          </div>
          <h1 className="text-2xl font-display font-black tracking-wide text-white">
            CJ <span className="text-gradient">SYSTEMS</span>
          </h1>
          <p className="text-xs text-beer-400 font-semibold uppercase tracking-widest mt-1 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Consola Maestra • SuperAdmin</span>
          </p>
        </div>

        {/* Aviso si ya está autenticado pero NO es superadmin */}
        {!authLoading && isAuthenticated && !isSuperAdmin ? (
          <div className="card p-6 border-red-500/30 bg-dark-50/90 text-center space-y-4">
            <p className="text-sm text-red-400 font-semibold">
              La sesión actual no tiene permisos de SuperAdmin.
            </p>
            <p className="text-xs text-gray-400">
              Cierra la sesión actual e ingresa con tu cuenta maestra de CJ Systems.
            </p>
            <button
              type="button"
              onClick={signOut}
              className="btn-primary w-full py-3 text-sm"
            >
              Cerrar sesión actual
            </button>
          </div>
        ) : (
          <div className="card p-6 border-beer-500/30 bg-dark-50/95 shadow-beer">
            <h2 className="text-lg font-display font-bold text-white mb-1">
              Acceso Restringido
            </h2>
            <p className="text-gray-400 text-xs mb-6">
              Exclusivo para Ing. Ciro José — Gestión de clientes y suscripciones.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Correo SuperAdmin
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="superadmin@cjsystems.com"
                    className="input-field pl-10 text-sm"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-10 pr-10 text-sm"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-6 py-3.5 text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Entrar a Consola Maestra
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        <div className="text-center mt-6 space-y-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-beer-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a CJ Systems</span>
          </Link>
          <p className="text-gray-600 text-[11px]">
            CJ Systems © {new Date().getFullYear()} — Ing. Ciro José
          </p>
        </div>
      </div>
    </div>
  )
}
