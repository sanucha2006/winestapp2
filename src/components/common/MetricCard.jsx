// src/components/common/MetricCard.jsx
// ─────────────────────────────────────────────────────────────
// Reusable Metric/KPI Card — extends Card.jsx
// ใช้ใน Admin VTuber Metrics, Team Metrics และ Finance Summary
// ─────────────────────────────────────────────────────────────
import Card from './Card'

/**
 * การ์ดแสดง KPI / Metric พร้อม icon, ค่าหลัก, และ subtitle รอง
 *
 * @param {Object} props
 * @param {React.ComponentType} props.icon - Lucide icon component
 * @param {string} props.label - ชื่อ metric (บรรทัดบน)
 * @param {string|number} props.value - ค่าหลักที่แสดง (bold ใหญ่)
 * @param {string} [props.subtitle] - ข้อความรองด้านล่าง value
 * @param {'violet'|'indigo'|'emerald'|'amber'|'cyan'|'rose'} [props.color='violet'] - โทนสี
 * @param {string} [props.className] - className เพิ่มเติม
 * @returns {React.ReactElement} การ์ด KPI สำหรับแสดง metric หนึ่งรายการ
 */
export default function MetricCard({ icon: Icon, label, value, subtitle, color = 'violet', className = '' }) {
  const COLOR_MAP = {
    violet:  { icon: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  val: 'text-violet-300' },
    indigo:  { icon: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  val: 'text-indigo-300' },
    emerald: { icon: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', val: 'text-emerald-300' },
    amber:   { icon: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   val: 'text-amber-300'  },
    cyan:    { icon: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    val: 'text-cyan-300'   },
    rose:    { icon: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    val: 'text-rose-300'   },
  }

  const c = COLOR_MAP[color] ?? COLOR_MAP.violet

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-black mt-1.5 ${c.val}`}>{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${c.bg} ${c.border}`}>
          <Icon size={16} className={c.icon} />
        </div>
      </div>
      {subtitle && (
        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">{subtitle}</p>
      )}
    </Card>
  )
}
