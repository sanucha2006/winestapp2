import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut, Sparkles } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// เลย์เอาต์หลักของระบบ (Main Layout Template)
// ปรับโทนสีเป็น Premium Dark Obsidian & Amethyst Theme
// ─────────────────────────────────────────────────────────────
export default function MainLayout({ children }) {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const getHeaderTitle = () => {
    if (role === 'admin') return 'Admin Management'
    if (role === 'vtuber') return 'VTuber Hun'
    if (role === 'team') return 'Team Management'
    return 'Agency Dashboard'
  }

  const displayEmail = user?.email ?? ''
  const displayName = displayEmail.split('@')[0] ?? 'User'

  return (
    <div className="min-h-screen bg-[#050508] text-slate-100 flex flex-col font-sans">
      
      {/* Universal Top Bar Header — Obsidian Deep Background with Subtle Border */}
      <header className="bg-[#0b0b12] border-b border-white/[0.04] h-16 px-4 sm:px-6 flex items-center justify-between shrink-0 relative z-20 shadow-md">
        <div className="flex items-center gap-3">
          {/* Logo with Amethyst gradient and light glow */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/20">
            <img 
            src="/winest_logo.png" 
            alt="WinestApp Logo" 
            className="w-8 h-8 object-contain rounded-lg shadow-md"
          />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm sm:text-base tracking-tight leading-none">
              {getHeaderTitle()}
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-1.5 hidden sm:block">
              WinestApp Management V.0.2.2 (Demo)
            </p>
          </div>
        </div>

        {/* Right Side: Account Details & Action Button */}
        <div className="flex items-center gap-4 select-none">
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-200 capitalize">{displayName}</span>
            <span className="text-[10px] text-slate-400">{displayEmail}</span>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all cursor-pointer h-[32px]"
          >
            <LogOut size={13} className="shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Dynamic Main Workspace Content — Seamless Midnight Space background */}
      <main className="flex-1 overflow-auto bg-[#07070c]">
        {children}
      </main>

    </div>
  )
}
