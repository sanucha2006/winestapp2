import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Sparkles, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn, user, role, loading: authLoading, authError, setAuthError } = useAuth()
  const navigate = useNavigate()

  // 1. Reactive Navigation: Watch user and role to trigger dashboard navigation
  useEffect(() => {
    if (user && role && !authLoading) {
      console.log('[LoginDebug] Reactive navigation triggered. Role:', role)
      if (role === 'admin') {
        console.log('[LoginDebug] Navigating to /admin-dashboard')
        navigate('/admin-dashboard', { replace: true })
      } else if (role === 'vtuber') {
        console.log('[LoginDebug] Navigating to /vtuber-dashboard')
        navigate('/vtuber-dashboard', { replace: true })
      } else if (role === 'team') {
        console.log('[LoginDebug] Navigating to /team-dashboard')
        navigate('/team-dashboard', { replace: true })
      }
    }
  }, [user, role, authLoading, navigate])

  // 2. Reactive Errors: Watch global authError and update local state, resetting the local spinner
  useEffect(() => {
    if (authError) {
      console.error('[LoginDebug] Global auth error detected:', authError)
      setError(authError)
      setLoading(false)
    }
  }, [authError])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (setAuthError) {
      setAuthError(null)
    }
    setLoading(true)
    console.log('[LoginDebug] handleSubmit triggered for email:', email)

    try {
      console.log('[LoginDebug] Awaiting signIn call...')
      const { data, error: err } = await signIn(email, password)
      console.log('[LoginDebug] signIn returned. Data:', data, 'Error:', err)

      if (err) {
        throw err
      }
      
      console.log('[LoginDebug] Auth successful, waiting for reactive role resolution...')
    } catch (err) {
      console.error('[LoginDebug] Auth Error Caught:', err)
      setError(err.message || 'Invalid email or password. Please try again.')
      setLoading(false)
    }
  }

  // Combined loading state: either local submit is loading, OR user is authenticated but role is still loading
  const isSpinnerLoading = loading || (user && authLoading)

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center relative overflow-hidden p-4">
      {/* Background decorative orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-700/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-900/5 rounded-full blur-3xl pointer-events-none" />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-violet-400/30 rounded-full animate-pulse"
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
        <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl opacity-20 blur-sm" />

        <div className="relative bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl shadow-violet-900/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-violet-900/50 mb-4">
              <Sparkles size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-gray-400 text-sm">
              Sign in to{' '}
              <span className="text-violet-400 font-medium">WinestApp</span> —
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
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@winest.agency"
                  required
                  className="w-full bg-gray-800/60 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-gray-800/60 border border-gray-700 rounded-xl pl-10 pr-12 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSpinnerLoading}
              className="w-full relative overflow-hidden bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-violet-800 disabled:to-purple-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-violet-900/40 hover:shadow-violet-900/60 disabled:cursor-not-allowed disabled:opacity-70 mt-2"
            >
              {isSpinnerLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-600 mt-6">
            Access is granted by your administrator only.
          </p>
        </div>
      </div>
    </div>
  )
}
