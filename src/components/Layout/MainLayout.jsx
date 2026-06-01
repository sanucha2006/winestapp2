import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut, Sparkles } from 'lucide-react'

export default function MainLayout({ children }) {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const getHeaderTitle = () => {
    if (role === 'admin') return 'Admin Portal (Management)'
    if (role === 'vtuber') return 'VTuber Dashboard (Talent Hub)'
    if (role === 'team') return 'Staff Board (Team Hub)'
    return 'Agency Dashboard'
  }

  const displayEmail = user?.email ?? ''
  const displayName = displayEmail.split('@')[0] ?? 'User'

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 flex flex-col">
      
      {/* Universal Top Bar Header */}
      <header className="bg-gray-900 border-b border-gray-800 h-16 px-4 sm:px-6 flex items-center justify-between shrink-0 relative z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md">
            <Sparkles size={16} className="text-white animate-pulse" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm sm:text-base tracking-tight leading-none">
              {getHeaderTitle()}
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1.5 hidden sm:block">
              WinestApp Agency Management Hub
            </p>
          </div>
        </div>

        {/* Right Side: Account Details & Action Button */}
        <div className="flex items-center gap-4 select-none">
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-300 capitalize">{displayName}</span>
            <span className="text-[10px] text-slate-500">{displayEmail}</span>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer h-[32px]"
          >
            <LogOut size={13} className="shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Dynamic Main Workspace Content */}
      <main className="flex-1 overflow-auto bg-[#07070a]">
        {children}
      </main>

    </div>
  )
}
