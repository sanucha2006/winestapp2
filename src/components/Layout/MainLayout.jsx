import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'

/**
 * คอมโพเนนต์โครงร่างหลักของหน้าเว็บ (Main Layout Template)
 * ประกอบด้วยแถบหัวเรื่องด้านบน (Top Bar Header) แสดงชื่อผู้ใช้งาน อีเมล ปุ่มล็อกเอาท์ 
 * และพื้นที่แสดงข้อมูลเนื้อหา (Main Workspace Content) ของแต่ละหน้า
 * 
 * TODO: Bug Risk - การใช้ตัวดำเนินการ ?? กับผลลัพธ์ของ `displayEmail.split('@')[0]` 
 * อาจทำให้ displayName ได้ค่าเป็นสตริงว่าง ("") ในกรณีที่ไม่มีข้อมูลอีเมลผู้ใช้ (เพราะ "" ไม่ใช่ null/undefined) 
 * ควรเปลี่ยนไปใช้ตัวดำเนินการ `|| 'User'` เพื่อให้ได้ค่า Fallback ที่เหมาะสม
 * 
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {React.ReactNode} props.children - คอมโพเนนต์หน้าย่อยที่ถูกเรนเดอร์ด้านในส่วน Main Workspace
 * @returns {React.ReactElement} โครงสร้างหน้าเว็บหลักพร้อม Top Header
 */
export default function MainLayout({ children }) {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()

  /**
   * จัดการการกดปุ่มออกจากระบบและพาผู้ใช้งานไปยังหน้า Login
   */
  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  /**
   * ดึงชื่อหัวข้อแดชบอร์ดตามสิทธิ์และบทบาทการใช้งานของผู้ใช้
   * 
   * @returns {string} ชื่อหัวข้อแถบด้านบน
   */
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
      <header className="bg-[#0b0b12] border-b border-white/[0.04] h-16 px-4 sm:px-6 flex items-center justify-between shrink-0 relative z-20 shadow-md">
        <div className="flex items-center gap-3">
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

      <main className="flex-1 overflow-auto bg-[#07070c]">
        {children}
      </main>
    </div>
  )
}
