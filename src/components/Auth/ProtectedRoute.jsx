import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

/**
 * คอมโพเนนต์ป้องกันเส้นทาง (Protected Route)
 * ทำหน้าที่ตรวจสอบสิทธิ์การเข้าถึงหน้าเว็บตามบทบาท (Role) ของผู้ใช้งาน 
 * หากไม่มีสิทธิ์หรือยังไม่ได้เข้าสู่ระบบ จะ Redirect ผู้ใช้ไปยังหน้าแดชบอร์ดที่เกี่ยวข้องหรือหน้าล็อกอินโดยอัตโนมัติ
 * 
 * TODO: Bug Risk - หากอยู่ในช่วงโหลด session เริ่มแรก (loading = true, user = null) เงื่อนไข `if (!user)` 
 * จะทำงานทันทีและสั่ง Redirect ไปยังหน้า /login ก่อนที่ระบบจะตรวจสอบ session เสร็จ 
 * ส่งผลให้ผู้ใช้ถูกเตะออกจากระบบชั่วคราว แม้จะล็อกอินค้างไว้
 * 
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {React.ReactNode} props.children - คอมโพเนนต์ภายในที่ต้องการจำกัดสิทธิ์เข้าใช้งาน
 * @param {string[]} [props.allowedRoles] - รายการบทบาทที่อนุญาตให้เข้าใช้งานได้ (เช่น ['admin', 'vtuber', 'team'])
 * @returns {React.ReactElement} คอมโพเนนต์ย่อย หรือหน้า Redirect ไปยังล็อกอิน/แดชบอร์ด
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth()

  if (loading) {
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

  if (!user) {
    return <Navigate to="/login" replace />
  }

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
