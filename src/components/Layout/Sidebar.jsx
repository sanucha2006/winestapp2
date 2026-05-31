import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard,
  Star,
  Users,
  LogOut,
  Sparkles,
  ChevronRight,
} from 'lucide-react'

const allNavItems = [
  {
    to: '/admin-dashboard',
    label: 'Admin Dashboard',
    icon: LayoutDashboard,
    description: 'Management',
    roles: ['admin'],
  },
  {
    to: '/vtuber-dashboard',
    label: 'VTuber Dashboard',
    icon: Star,
    description: 'Talents',
    roles: ['vtuber'],
  },
  {
    to: '/team-dashboard',
    label: 'Team Dashboard',
    icon: Users,
    description: 'Staff',
    roles: ['team'],
  },
]

export default function Sidebar() {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const displayEmail = user?.email ?? 'Unknown'
  const displayName = displayEmail.split('@')[0]

  // Filter menu items by user's current role
  const filteredNavItems = allNavItems.filter((item) => item.roles.includes(role))

  // Custom styling for the profile role badge
  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return {
          label: 'ADMIN',
          bg: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
          dot: 'bg-violet-400',
        }
      case 'vtuber':
        return {
          label: 'TALENT',
          bg: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
          dot: 'bg-fuchsia-400',
        }
      case 'team':
        return {
          label: 'STAFF',
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          dot: 'bg-indigo-400',
        }
      default:
        return {
          label: 'GUEST',
          bg: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
          dot: 'bg-gray-400',
        }
    }
  }

  const badge = getRoleBadge()

  return (
    <aside className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col relative overflow-hidden shrink-0">
      {/* Background glow */}
      <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-violet-900/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Logo / Brand */}
      <div className="relative z-10 px-6 py-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight tracking-wide">
              WinestApp
            </h1>
            <p className="text-violet-400 text-xs font-medium">VTuber Agency</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex-1 px-4 py-6 space-y-1">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest px-3 mb-3">
          Menu
        </p>
        
        {filteredNavItems.length > 0 ? (
          filteredNavItems.map(({ to, label, icon: Icon, description }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-violet-600/20 border border-violet-500/30 text-violet-300'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? 'bg-violet-600/30'
                        : 'bg-gray-800 group-hover:bg-gray-700'
                    }`}
                  >
                    <Icon
                      size={16}
                      className={isActive ? 'text-violet-400' : 'text-gray-400'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">
                      {label}
                    </p>
                    <p className="text-xs text-gray-500 leading-tight">
                      {description}
                    </p>
                  </div>
                  {isActive && (
                    <ChevronRight size={14} className="text-violet-400 shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          ))
        ) : (
          <p className="text-xs text-gray-600 px-3 italic">No dashboard assigned</p>
        )}
      </nav>

      {/* User Info & Sign Out */}
      <div className="relative z-10 px-4 pb-6 border-t border-gray-800 pt-4">
        <div className="bg-gray-800/60 border border-gray-700/35 rounded-xl p-3 mb-3">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold uppercase">
                {displayName.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate capitalize">
                {displayName}
              </p>
              <p className="text-gray-500 text-xs truncate">{displayEmail}</p>
            </div>
          </div>
          
          {/* Dynamic Role Badge */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold tracking-wider uppercase w-fit ${badge.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200 group"
        >
          <div className="w-8 h-8 rounded-lg bg-gray-800 group-hover:bg-red-500/10 flex items-center justify-center transition-all duration-200">
            <LogOut size={15} />
          </div>
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
