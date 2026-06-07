import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

/**
 * Component Provider สำหรับระบบยืนยันตัวตนและการเข้าสู่ระบบ (Authentication & Authorization)
 * ทำหน้าที่ฟังเหตุการณ์การเปลี่ยนสถานะการเข้าสู่ระบบผ่าน Supabase, การดึงบทบาทของผู้ใช้ (Role Fetching) 
 * และเผยแพร่ข้อมูลผู้ใช้งาน (user, session, role, loading) ไปยัง Component อื่นๆ
 * 
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {React.ReactNode} props.children - Component ลูกที่ต้องการเข้าถึงสิทธิ์การยืนยันตัวตน
 * @returns {React.ReactElement} Provider Component ของสิทธิ์ผู้ใช้
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [authError, setAuthError] = useState(null)

  /**
   * ดึงข้อมูลบทบาทผู้ใช้ (Role) จากตาราง profiles ในฐานข้อมูล
   * ห่อหุ้มด้วย useCallback เพื่อให้สามารถนำไปใช้ใน useEffect ได้อย่างปลอดภัยโดยไม่สร้างฟังก์ชันใหม่ซ้ำ ๆ
   * 
   * @param {string} userId - ไอดีผู้ใช้จากระบบ Auth (UUID)
   * @returns {Promise<string|null>} บทบาทของผู้ใช้งาน หรือ null หากไม่พบ
   */
  const fetchUserRole = useCallback(async (userId) => {
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
        console.log('[AuthDebug] Found user role:', data.role)
        setRole(data.role)
        return data.role
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
  }, [])

  useEffect(() => {
    let active = true
    console.log('[AuthDebug] useEffect initial setup running')

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

  useEffect(() => {
    let active = true
    const currentUserId = user?.id

    if (currentUserId) {
      console.log('[AuthDebug] User ID changed. Deferring fetchUserRole...')
      const timer = setTimeout(async () => {
        if (!active) return
        try {
          await fetchUserRole(currentUserId)
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
  }, [user?.id, fetchUserRole])

  /**
   * เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน
   * 
   * @param {string} email - อีเมลผู้ใช้
   * @param {string} password - รหัสผ่านผู้ใช้
   * @returns {Promise<Object>} ออบเจกต์ผลลัพธ์ { data, error }
   */
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

  /**
   * ออกจากระบบและล้างค่าสถานะการเข้าสู่ระบบทั้งหมด
   * 
   * @param {void} ไม่มี parameter
   * @returns {Promise<Object>} ออบเจกต์ผลลัพธ์ที่มีคุณสมบัติ error
   */
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

/**
 * Custom Hook สำหรับเรียกใช้ข้อมูลและฟังก์ชันจาก AuthContext
 * ช่วยให้เข้าถึงข้อมูลผู้ใช้ ล็อกอิน/ล็อกเอาท์ และเช็กสิทธิ์ผ่านคอมโพเนนต์ต่างๆ ได้สะดวก
 * 
 * @param {void} ไม่มี parameter
 * @returns {Object} context ค่าที่ประกอบด้วย { user, session, role, loading, authError, signIn, signOut, setAuthError }
 * @throws {Error} ถ้าเรียกใช้ Hook นอกพื้นที่ที่ AuthProvider ครอบอยู่
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
