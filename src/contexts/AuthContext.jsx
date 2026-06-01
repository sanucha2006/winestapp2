import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

function normalizeRole(role) {
  if (role === 'talent') return 'vtuber'
  if (role === 'staff') return 'team'
  return role
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [authError, setAuthError] = useState(null)

  // Helper to fetch user role
  const fetchUserRole = async (userId) => {
    console.log('[AuthDebug] fetchUserRole started for:', userId)
    if (!userId) {
      console.log('[AuthDebug] No userId provided to fetchUserRole')
      setRole(null)
      setProfileLoading(false)
      return null
    }
    
    setProfileLoading(true)
    setAuthError(null)
    try {
      console.log('[AuthDebug] Querying profiles table for userId:', userId)
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      console.log('[AuthDebug] Profiles query resolved. Data:', data, 'Error:', error)
      if (error) {
        throw error
      }
      
      if (data && data.role) {
        const normalizedRole = normalizeRole(data.role)
        console.log('[AuthDebug] Found user role:', data.role, 'Normalized:', normalizedRole)
        setRole(normalizedRole)
        return normalizedRole
      } else {
        throw new Error('User profile or role not found in database.')
      }
    } catch (err) {
      console.error('Auth Error: Failed to fetch user role:', err)
      const isDev = import.meta.env.DEV
      console.log('[AuthDebug] fetchUserRole error caught. isDev:', isDev)
      if (isDev) {
        console.warn('Development mode: Falling back to admin role.')
        setRole('admin')
        return 'admin'
      } else {
        setRole(null)
        const errMsg = 'ไม่มีสิทธิ์เข้าใช้งาน: ไม่พบข้อมูลบทบาทผู้ใช้งานในระบบ (Unauthorized: User profile not found)'
        setAuthError(errMsg)
        
        // Sign out asynchronously so we do not block or interfere with the current state loop
        setTimeout(async () => {
          try {
            await supabase.auth.signOut()
          } catch (signOutErr) {
            console.error('Failed to sign out on role fetch error:', signOutErr)
          }
        }, 0)

        throw new Error(errMsg, { cause: err })
      }
    } finally {
      console.log('[AuthDebug] fetchUserRole finally block running')
      setProfileLoading(false)
    }
  }

  // Effect 1: Handle initial session load and auth state listeners
  useEffect(() => {
    let active = true
    console.log('[AuthDebug] useEffect initial setup running')

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      console.log('[AuthDebug] getSession resolved. Session user:', session?.user?.email)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch((err) => {
      console.error('Auth Error: Session initialization promise error:', err)
      if (active) {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return
        console.log('[AuthDebug] onAuthStateChange event triggered:', event, 'User:', session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      console.log('[AuthDebug] useEffect cleanup running')
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // Effect 2: Fetch user profile role reactively when user state changes
  // This is completely decoupled from the auth callbacks to avoid Web Lock deadlocks!
  useEffect(() => {
    let active = true

    if (user) {
      console.log('[AuthDebug] User state changed. Deferring fetchUserRole...')
      const timer = setTimeout(async () => {
        if (!active) return
        try {
          await fetchUserRole(user.id)
        } catch (err) {
          console.error('[AuthDebug] Deferred fetchUserRole threw error:', err)
        }
      }, 0)

      return () => {
        active = false
        clearTimeout(timer)
      }
    } else {
      const timer = setTimeout(() => {
        setRole(null)
        setProfileLoading(false)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [user])

  const signIn = async (email, password) => {
    console.log('[AuthDebug] signIn function called for:', email)
    setAuthError(null)
    try {
      console.log('[AuthDebug] Calling supabase.auth.signInWithPassword...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log('[AuthDebug] signInWithPassword resolved. Data:', data, 'Error:', error)
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Auth Error:', error)
      setAuthError(error.message || 'Invalid email or password.')
      return { data: null, error }
    }
  }

  const signOut = async () => {
    console.log('[AuthDebug] signOut function called')
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      console.error('Auth Error:', error)
      return { error }
    } finally {
      setRole(null)
      setUser(null)
      setSession(null)
      setProfileLoading(false)
      setLoading(false)
      setAuthError(null)
    }
  }

  const value = {
    user,
    session,
    role,
    loading: loading || profileLoading,
    authError,
    signIn,
    signOut,
    setAuthError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
