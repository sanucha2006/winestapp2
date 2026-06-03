import { normalizeStatus } from '../../lib/calendarUtils'

const STATUS_MAP = {
  pending: {
    label: 'รอดำเนินการ',
    cls: 'bg-slate-800/60 text-slate-400 border border-slate-700/30',
  },
  in_progress: {
    label: 'กำลังทำ',
    cls: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20',
  },
  in_review: {
    label: 'รอตรวจ',
    cls: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
  },
  done: {
    label: 'เสร็จแล้ว',
    cls: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
  },
  paid: {
    label: 'จ่ายแล้ว',
    cls: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
  },
  cancelled: {
    label: 'ยกเลิก',
    cls: 'bg-rose-500/10 text-rose-300 border border-rose-500/20',
  },
}

export default function StatusBadge({ status, className = '' }) {
  const cfg = STATUS_MAP[normalizeStatus(status)] ?? STATUS_MAP.pending

  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${cfg.cls} ${className}`}>
      {cfg.label}
    </span>
  )
}
