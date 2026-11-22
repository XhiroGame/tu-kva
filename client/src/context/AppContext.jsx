import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getAdminProfile } from '@/lib/api'
import { applyBusinessTheme } from '@/lib/theme'

/**
 * Global App Context for CJ Systems — Plataforma Musical Multi-Negocio
 * Manages: auth session, user role (admin / superadmin), active business info, loading state
 */

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [session, setSession]         = useState(null)
  const [user, setUser]               = useState(null)
  const [business, setBusiness]       = useState(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isLoading, setIsLoading]     = useState(true)

  const syncUserProfile = async (currentSession) => {
    if (!currentSession?.user) {
      setBusiness(null)
      setIsSuperAdmin(false)
      return
    }

    try {
      const res = await getAdminProfile()
      if (res?.success && res.data) {
        if (res.data.business) {
          setBusiness(res.data.business)
          applyBusinessTheme(res.data.business.branding)
        }
        setIsSuperAdmin(Boolean(res.data.user?.isSuperAdmin))
      }
    } catch (err) {
      console.warn('No se pudo cargar perfil extendido, usando negocio por defecto:', err)
      const fallbackSlug = currentSession.user?.user_metadata?.business_slug || 'tu-kva'
      const fallbackName = currentSession.user?.user_metadata?.business_name || 'Tu K-VA'
      setBusiness({
        id: 'a1b2c3d4-0000-0000-0000-000000000001',
        name: fallbackName,
        slug: fallbackSlug,
      })
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session) {
        await syncUserProfile(session)
      }
      setIsLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session) {
          syncUserProfile(session)
        } else {
          setBusiness(null)
          setIsSuperAdmin(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setBusiness(null)
    setIsSuperAdmin(false)
  }

  const value = {
    session,
    user,
    business,
    setBusiness,
    isSuperAdmin,
    isLoading,
    isAuthenticated: !!session,
    signOut,
    refreshProfile: () => syncUserProfile(session),
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

/**
 * Hook to access global app context.
 * Must be used within <AppProvider>.
 */
export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export default AppContext
