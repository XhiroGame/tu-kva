import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Global App Context for BEER MUSIC
 * Manages: auth session, business info, loading state
 */

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [session, setSession]       = useState(null)
  const [user, setUser]             = useState(null)
  const [business, setBusiness]     = useState(null)
  const [isLoading, setIsLoading]   = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setBusiness(null)
  }

  const value = {
    session,
    user,
    business,
    setBusiness,
    isLoading,
    isAuthenticated: !!session,
    signOut,
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
