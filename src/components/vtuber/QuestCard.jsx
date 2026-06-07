// src/components/vtuber/QuestCard.jsx
// ─────────────────────────────────────────────────────────────
// การ์ดแสดงข้อมูลเควส ความคืบหน้า และปุ่มตรวจสอบส่งงาน
// Export: FREQ_CONFIG, TARGET_CONFIG (shared with OverviewTab & GoalsTab)
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import {
  Film, Tv2, CheckCircle2,
  Star, Loader2, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react'

/**
 * รายละเอียดการกำหนดสีและข้อความของแต่ละประเภทความถี่เควส (รายวัน, รายสัปดาห์, รายเดือน)
 * ปรับโทนสีพาสเทลระดับพรีเมียม สบายตาและเข้ากับพื้นหลังมืด
 *
 * @type {Object<string, {label: string, color: string, bg: string, border: string, text: string, dot: string}>}
 */
export const FREQ_CONFIG = {
  daily:   { label: 'รายวัน',     color: 'cyan',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   text: 'text-cyan-400',   dot: 'bg-cyan-400' },
  weekly:  { label: 'รายสัปดาห์', color: 'violet', bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', dot: 'bg-violet-400' },
  monthly: { label: 'รายเดือน',   color: 'amber',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-400',  dot: 'bg-amber-400' },
}

/**
 * รายละเอียดการกำหนดไอคอน ชื่อเรียก และหน่วยนับ ของประเภทเป้าหมายเควส
 *
 * @type {Object<string, {icon: React.ComponentType, label: string, unit: string}>}
 */
export const TARGET_CONFIG = {
  short_video: { icon: Film,     label: 'คลิปสั้น', unit: 'คลิป' },
  livestream:  { icon: Tv2,      label: 'ไลฟ์สตรีม', unit: 'ชั่วโมง' },
}

// ══════════════════════════════════════════════════════════════
// 🃏 QuestCard — แสดงข้อมูลเควส ความคืบหน้า และปุ่มตรวจสอบส่งงาน
// ══════════════════════════════════════════════════════════════
/**
 * แสดงการ์ดเควสพร้อมความคืบหน้า รางวัล รายละเอียดเพิ่มเติม และปุ่มส่งเควส
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {Object} props.tx - ข้อมูล transaction ของเควสพร้อมข้อมูล quest ที่ซ้อนอยู่ใน tx.quests
 * @param {Function} props.onSubmit - callback สำหรับส่งเควสไปตรวจ รับ transaction id เป็น argument
 * @returns {React.ReactElement} การ์ดเควสหนึ่งรายการพร้อม progress และ action
 */
export default function QuestCard({ tx, onSubmit }) {
  const [submitting, setSubmitting] = useState(false) // สถานะกำลังส่งเควสไปตรวจ
  const [expanded, setExpanded] = useState(false)     // เปิด/ปิด การแสดงรายละเอียดเพิ่มเติม

  
  
  const q          = tx.quests ?? {}
  const cfg        = FREQ_CONFIG[q.frequency] ?? FREQ_CONFIG.weekly
  const targetCfg  = TARGET_CONFIG[q.target_type] ?? TARGET_CONFIG.short_video
  const TargetIcon = targetCfg.icon

  // คำนวณร้อยละของความสำเร็จ
  const current  = tx.current_value ?? 0
  const target   = q.target_value ?? 1
  const pct      = Math.min(100, Math.round((current / target) * 100))
  const isDone   = tx.is_done
  const isLive   = q.target_type === 'livestream'

  // ฟอร์แมตเพื่อแสดงผล ถ้าเป็นไลฟ์สตรีมให้เอา (นาที / 60) เพื่อโชว์เป็นชั่วโมงให้สวยงาม
  const formatValue = (v) => Number.isInteger(v) ? v : Number(v.toFixed(1))
  const displayCurrent = isLive ? formatValue(current / 60) : current
  const displayTarget  = isLive ? formatValue(target / 60) : target

  // ฟังก์ชันควบคุมปุ่มตรวจสอบ/ส่งเควส
  /**
   * ส่งเควสไปตรวจและกันการกดซ้ำระหว่างกำลัง submit
   *
   * @param {void} ไม่มี parameter
   * @returns {Promise<void>} Promise ที่ resolve เมื่อ submit เสร็จและ state ถูกคืนค่า
   */
  const handleSubmit = async () => {
    if (submitting || isDone) return
    setSubmitting(true)
    try { await onSubmit(tx.id) }
    finally { setSubmitting(false) }
  }

  return (
    <div className={`rounded-xl border transition-all mb-1.5
      ${isDone
        ? 'bg-[#0a1813] border-emerald-500/20 text-slate-300'
        : 'bg-[#0d0d16] border-white/[0.05] hover:border-violet-500/20 hover:bg-[#11111d]'}`}>
      
      {/* ส่วนเนื้อหาหลัก */}
      <div className="flex items-start gap-2.5 p-3">
        <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0
          ${isDone ? 'bg-emerald-500/20 text-emerald-400' : cfg.bg}`}>
          {isDone
            ? <CheckCircle2 size={13} />
            : <TargetIcon size={13} className={cfg.text} />}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold leading-snug ${isDone ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
            {q.title ?? '—'}
          </p>

          {/* แถบความคืบหน้า (Progress Bar) */}
          {!isDone && (
            <div className="mt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-400">
                  {displayCurrent} / {displayTarget} {targetCfg.unit}
                </span>
                <span className="text-[10px] font-bold text-slate-300">{pct}%</span>
              </div>
              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500
                    ${pct >= 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {isDone && (
            <p className="text-[10px] text-emerald-400 mt-1 font-medium flex items-center gap-1">
              <span>สำเร็จแล้ว! ได้รับ</span>
              <span className="flex items-center gap-0.5 text-amber-400 font-bold bg-amber-500/10 px-1 rounded">{q.reward_stars} ⭐</span>
            </p>
          )}
        </div>

        {/* ปุ่มลูกศรเพื่อดูรายละเอียด (แสดงก็ต่อเมื่อมี Description) */}
        {q.description && (
          <button onClick={() => setExpanded(p => !p)} className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 mt-0.5">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>

      {/* คำอธิบายแบบขยายเพิ่มเติม (Expandable Area) */}
      {expanded && q.description && (
        <div className="px-3 pb-2 -mt-1">
          <p className="text-[10px] text-slate-400 leading-relaxed bg-[#13131f] rounded-lg px-3 py-2 border border-white/[0.03]">
            {q.description}
          </p>
        </div>
      )}

      {/* ส่วนแสดงของรางวัล และ ปุ่มกดเคลม/ส่งเควส */}
      {!isDone && (
        <div className="flex items-center justify-between px-3 pb-3 gap-2 border-t border-white/[0.03] pt-2 mt-1">
          <div className="flex items-center gap-1 text-[10px] text-amber-500/80">
            <Star size={10} className="fill-amber-500/80" />
            <span className="font-bold">{q.reward_stars ?? 0}</span>
            <span className="text-amber-600/70">stars</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer
              ${pct >= 100
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40'
                : 'bg-violet-600/85 hover:bg-violet-600 text-white'}`}
          >
            {submitting
              ? <><Loader2 size={11} className="animate-spin" /> ตรวจสอบ...</>
              : <><RefreshCw size={11} /> ส่งเควส</>}
          </button>
        </div>
      )}
    </div>
  )
}
