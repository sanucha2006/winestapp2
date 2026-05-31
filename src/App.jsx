import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import MainLayout from './components/Layout/MainLayout'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import VTuberDashboard from './pages/VTuberDashboard'
import TeamDashboard from './pages/TeamDashboard'

// Safe dynamic root redirect based on user role
function RootRedirect() {
  const { user, role, loading } = useAuth()

  // Only spin if we have a user but are still loading their profile role.
  // Otherwise, immediately let the unauthenticated check redirect to login.
  if (loading && user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role === 'admin') {
    return <Navigate to="/admin-dashboard" replace />
  } else if (role === 'vtuber') {
    return <Navigate to="/vtuber-dashboard" replace />
  } else if (role === 'team') {
    return <Navigate to="/team-dashboard" replace />
  }

  // Fallback
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes by Role */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MainLayout>
                  <AdminDashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vtuber-dashboard"
            element={
              <ProtectedRoute allowedRoles={['vtuber']}>
                <MainLayout>
                  <VTuberDashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/team-dashboard"
            element={
              <ProtectedRoute allowedRoles={['team']}>
                <MainLayout>
                  <TeamDashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Default root path dynamic redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Catch-all: redirect to dynamic root check */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
