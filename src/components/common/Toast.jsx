import { useEffect } from 'react'
import { Sparkles, AlertTriangle, X } from 'lucide-react'

/**
 * คอมโพเนนต์การแจ้งเตือนชั่วคราว (Toast Component)
 * แสดงป้ายแจ้งเตือนความสำเร็จ (Success) หรือความผิดพลาด (Error) ที่บริเวณกึ่งกลางล่างของหน้าจอ 
 * โดยมีเอฟเฟกต์การแสดงผลและจะหายไปเองภายใน 4 วินาที
 * 
 * TODO: Bug Risk - หากฟังก์ชัน onDismiss ในคอมโพเนนต์แม่ไม่ได้ถูกห่อหุ้มด้วย useCallback 
 * การเปลี่ยนจุดอ้างอิงฟังก์ชันในทุกรอบเรนเดอร์จะส่งผลให้ useEffect ชุดนี้ทำงานใหม่ตลอดเวลา 
 * ซึ่งจะรีเซ็ตค่า setTimeout ทำให้อาจปิดตัวป้ายแจ้งเตือนไม่ตรงเวลา
 * 
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {Object|null} props.toast - ออบเจกต์ข้อมูลข้อความแจ้งเตือน
 * @param {boolean} props.toast.success - ระบุว่าเป็นการแจ้งเตือนสำเร็จ (true) หรือล้มเหลว (false)
 * @param {string} props.toast.message - ข้อความที่จะแสดงบนป้ายแจ้งเตือน
 * @param {function} props.onDismiss - ฟังก์ชันที่จะถูกเรียกเมื่อต้องการปิดหรือซ่อนป้ายเตือน
 * @returns {React.ReactElement|null} ป้าย Toast หรือ null หากไม่มีข้อความแสดง
 */
export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [toast, onDismiss])

  if (!toast) return null
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold transition-all animate-in slide-in-from-bottom-4 duration-300
      ${toast.success
        ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300 backdrop-blur-md'
        : 'bg-rose-950/90 border-rose-500/40 text-rose-300 backdrop-blur-md'}`}>
      {toast.success ? <Sparkles size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-rose-400" />}
      <span>{toast.message}</span>
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  )
}
