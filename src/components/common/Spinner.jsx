import { Loader2 } from 'lucide-react'

/**
 * คอมโพเนนต์ตัวบ่งชี้สถานะกำลังโหลด (Spinner Component)
 * แสดงไอคอนรูปวงกลมหมุน (Lucide Loader2) พร้อมข้อความกำกับ เพื่อแจ้งผู้ใช้งานว่ากำลังประมวลผลข้อมูล
 * 
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {string} [props.text='กำลังโหลด...'] - ข้อความที่ต้องการให้แสดงถัดจากไอคอนหมุน
 * @returns {React.ReactElement} แถบสปินเนอร์และข้อความ
 */
export default function Spinner({ text = 'กำลังโหลด...' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
      <Loader2 size={16} className="animate-spin" />
      <span className="text-xs">{text}</span>
    </div>
  )
}
