// src/pages/LoginPage.jsx
// ─────────────────────────────────────────────────────────────
// หน้า Login — ตรวจสอบสิทธิ์ผ่าน Supabase Auth
// หลัง login สำเร็จ AuthContext จะอ่าน role จาก profiles table
// แล้ว useEffect จะ redirect ไปยังหน้า dashboard ที่ถูกต้องโดยอัตโนมัติ
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Sparkles, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  // ── State ──────────────────────────────────────────────────
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  // ── Context & Router ───────────────────────────────────────
  const { signIn, user, role, loading: authLoading, authError, setAuthError } = useAuth()
  const navigate = useNavigate()

  // ── Effect: redirect หลังจาก role ถูก resolve ──────────────
  // ทำงานเมื่อ user + role พร้อมทั้งคู่ และ authLoading เป็น false
  // role ถูก set โดย AuthContext หลังจาก Supabase Auth สำเร็จ
  useEffect(() => {
    if (!user || !role || authLoading) return
    if (role === 'admin')  navigate('/admin-dashboard',  { replace: true })
    if (role === 'vtuber') navigate('/vtuber-dashboard', { replace: true })
    if (role === 'team')   navigate('/team-dashboard',   { replace: true })
  }, [user, role, authLoading, navigate])

  // ── Effect: รับ error จาก AuthContext มาแสดงในฟอร์ม ────────
  // authError เกิดจากการ re-check session ใน context layer
  useEffect(() => {
    if (!authError) return
    setError(authError)
    setLoading(false)
  }, [authError])

  // ── Handler: submit form ────────────────────────────────────
  /**
   * เรียก signIn จาก AuthContext → Supabase Auth
   * ถ้าสำเร็จ ไม่ต้อง navigate ที่นี่ — useEffect ด้านบนจัดการให้
   * ถ้าล้มเหลว setError เพื่อแสดง Alert ในฟอร์ม
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setAuthError?.(null)
    setLoading(true)

    try {
      const { error: err } = await signIn(email, password)
      if (err) throw err
      // เมื่อ signIn สำเร็จ AuthContext จะอัปเดต user → role
      // useEffect ด้านบนจะ redirect อัตโนมัติ
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.')
      setLoading(false)
    }
  }

  // ── Derived State ──────────────────────────────────────────
  // แสดง spinner เมื่อ:
  //   (1) กำลัง submit ฟอร์ม (loading)
  //   (2) login แล้วแต่ authContext ยังโหลด role ไม่เสร็จ (user && authLoading)
  const isSpinnerLoading = loading || (user && authLoading)

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center relative overflow-hidden p-4">
      {/* Background decorative orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-700/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-950/5 rounded-full blur-3xl pointer-events-none" />

      {/* Floating particles (decorative) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-violet-400/20 rounded-full animate-pulse"
            style={{
              top: `${15 + i * 14}%`,
              left: `${10 + i * 15}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${2 + i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Glow border effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600/30 to-indigo-600/30 rounded-2xl opacity-40 blur-sm" />

        <div className="relative bg-[#0d0d16]/95 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 shadow-2xl shadow-violet-950/20">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-indigo-900/30 mb-4">
              <Sparkles size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-slate-400 text-sm">
              Sign in to{' '}
              <span className="text-indigo-400 font-medium">WinestApp</span> —
              VTuber Agency Portal
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm leading-relaxed">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@winest.agency"
                  required
                  className="w-full bg-[#141420]/60 border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/80 focus:ring-2 focus:ring-violet-500/15 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#141420]/60 border border-white/[0.08] rounded-xl pl-10 pr-12 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/80 focus:ring-2 focus:ring-violet-500/15 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSpinnerLoading}
              className="w-full relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-violet-800 disabled:to-indigo-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-900/25 hover:shadow-indigo-900/40 disabled:cursor-not-allowed disabled:opacity-70 mt-2"
            >
              {isSpinnerLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-600 mt-6">
            Access is granted by your administrator only.
          </p>
        </div>
      </div>
    </div>
  )
}
