import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth()

  // Only show the loading spinner if a user is logged in, but we are still waiting for their role to load.
  // If there is no user at all, we don't show the full spinner and let the redirect logic handle it.
  if (loading && user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-violet-300 text-sm font-medium tracking-widest uppercase">
            Verifying Credentials...
          </p>
        </div>
      </div>
    )
  }

  // If loading is complete and there's no user, redirect to login
  if (!user && !loading) {
    return <Navigate to="/login" replace />
  }

  // Fallback: If not logged in (even if loading is true, to prevent any locked state)
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If roles are specified and user's role is not allowed
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'admin') {
      return <Navigate to="/admin-dashboard" replace />
    } else if (role === 'vtuber') {
      return <Navigate to="/vtuber-dashboard" replace />
    } else if (role === 'team') {
      return <Navigate to="/team-dashboard" replace />
    } else {
      return <Navigate to="/login" replace />
    }
  }

  return children
}
