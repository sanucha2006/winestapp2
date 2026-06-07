import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import MainLayout from './components/Layout/MainLayout'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import VTuberDashboard from './pages/VTuberDashboard'
import TeamDashboard from './pages/TeamDashboard'

/**
 * คอมโพเนนต์ทำหน้าที่ Redirect ผู้ใช้ไปยังหน้าแดชบอร์ดที่ถูกต้องตามบทบาท (Role) ของผู้ใช้แบบไดนามิก
 * 
 * TODO: Bug Risk - หาก loading เป็น true แต่ user ยังเป็น null (เช่น อยู่ระหว่างการดึงข้อมูล session เริ่มแรก) 
 * อาจจะส่งผลให้ระบบ Redirect ไปหน้า /login ทันที ทำให้เกิดอาการหน้าล็อกอินกะพริบก่อนหน้าแดชบอร์ดจะโหลดสำเร็จ
 * 
 * @returns {React.ReactElement} คอมโพเนนต์นำทาง (Navigate) หรือ Spinner แสดงสถานะการโหลด
 */
function RootRedirect() {
  const { user, role, loading } = useAuth()

  if (loading) {
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

  return <Navigate to="/login" replace />
}

/**
 * คอมโพเนนต์หลักของแอปพลิเคชัน (Root Component)
 * กำหนดโครงสร้าง Routing ทั้งหมดของระบบ และครอบด้วย AuthProvider เพื่อจัดการข้อมูลผู้ใช้ที่เข้าสู่ระบบ
 * 
 * @returns {React.ReactElement} โครงสร้าง Routing ของแอปพลิเคชัน
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

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

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
