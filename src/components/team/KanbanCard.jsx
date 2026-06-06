// src/components/team/KanbanCard.jsx
// ─────────────────────────────────────────────────────────────
// การ์ดใน Kanban Board แสดงชื่องาน priority และปุ่มเลื่อน status
// ─────────────────────────────────────────────────────────────
import { ChevronRight } from 'lucide-react'

/**
 * คืน Tailwind class string สำหรับ badge priority ของ commission
 *
 * @param {string} priority - ระดับความสำคัญของงาน commission
 * @returns {string} Tailwind class สำหรับสีและ border ของ priority badge
 */
function getPriorityBadge(priority) {
  switch (priority) {
    case 'Urgent': return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'High':   return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'Medium': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    default:       return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }
}

/**
 * แสดงการ์ดงานใน Kanban Board พร้อมปุ่มเลื่อนสถานะไปขั้นถัดไป
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {Object} props.task - ข้อมูลงานที่ต้องการแสดงในการ์ด
 * @param {Function} props.onAdvance - callback เมื่อกดเลื่อนสถานะงาน รับ task id เป็น argument
 * @param {'indigo'|'amber'|'done'} [props.advanceColor='indigo'] - ชุดสี hover ของปุ่มเลื่อนสถานะ
 * @param {string} [props.borderCls='border-white/[0.05]'] - class สี border ของการ์ด
 * @returns {React.ReactElement} การ์ด Kanban สำหรับงานหนึ่งรายการ
 */
export default function KanbanCard({ task, onAdvance, advanceColor = 'indigo', borderCls = 'border-white/[0.05]' }) {
  // สีปุ่มลูกศร → ขึ้นอยู่กับ column ปัจจุบัน
  const hoverMap = { indigo: 'hover:bg-indigo-600', amber: 'hover:bg-amber-600' }
  return (
    <div className={`bg-[#161622] border ${borderCls} rounded-xl p-3 flex flex-col justify-between`}>
      <div>
        <div className="flex justify-between gap-2 mb-1.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase bg-black/30 px-2 py-0.5 rounded">{task.category}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(task.priority)}`}>{task.priority}</span>
        </div>
        <h4 className="text-slate-200 font-bold text-xs leading-snug">{task.title}</h4>
      </div>
      <div className="border-t border-white/[0.04] pt-2 mt-2 flex items-center justify-between">
        <span className="text-[10px] text-slate-500">{task.talent}</span>
        <button onClick={() => onAdvance(task.id)}
          className={`p-1 rounded-lg bg-[#1a1a27] ${hoverMap[advanceColor]} text-slate-400 hover:text-white transition-colors`}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
