// src/components/calendar/AvailabilityCalendarGrid.jsx
// ─────────────────────────────────────────────────────────────
// Shared UI: calendar grid for availability display/editing
// Used by: TeamAvailabilityViewer (read-only), VTuberAvailabilityManager (interactive)
//
// Props:
//   calendarDays   — array from getCalendarDays() (nulls for blank cells)
//   availableDays  — array of available day numbers [1, 3, 5, ...]
//   isEditMode     — (optional) enables click interaction on day cells
//   onToggleDay    — (optional) callback(day) called when a day cell is clicked
// ─────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

/**
 * แสดง Grid ปฏิทินสำหรับดูหรือแก้ไขวันว่างของ VTuber
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {(number|null)[]} props.calendarDays - รายการวันที่ของเดือนที่ผ่านการจัดรูปแบบสำหรับ Grid แล้ว โดยช่องว่างใช้ค่า null
 * @param {number[]} props.availableDays - รายการเลขวันที่ที่ถูกระบุว่าว่าง
 * @param {boolean} [props.isEditMode=false] - กำหนดว่า Grid อยู่ในโหมดแก้ไขและสามารถคลิกวันที่ได้หรือไม่
 * @param {Function} [props.onToggleDay] - callback เมื่อคลิกสลับสถานะวันว่าง รับเลขวันที่เป็น argument
 * @returns {React.ReactElement} Grid ปฏิทินสำหรับแสดงสถานะวันว่างหรือแก้ไขวันว่าง
 */
export default function AvailabilityCalendarGrid({
  calendarDays,
  availableDays,
  isEditMode = false,
  onToggleDay,
}) {
  return (
    <div className="bg-[#0f0f17] rounded-lg border border-white/[0.05] p-3">
      {/* Header วันในสัปดาห์ */}
      <div className="grid grid-cols-7 mb-2 gap-0.5">
        {WEEKDAY_LABELS.map(day => (
          <div key={day} className="text-center text-[9px] font-bold text-slate-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Grid วันต่างๆ */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day, index) => {
          if (!day) return <div key={`blank-${index}`} className="bg-transparent aspect-square" />

          const isAvailable = availableDays.includes(day)
          const isInteractive = isEditMode && typeof onToggleDay === 'function'

          // ── VTuberAvailabilityManager: interactive <button> ──
          if (isInteractive) {
            return (
              <button
                key={day}
                type="button"
                onClick={() => onToggleDay(day)}
                className={`aspect-square flex items-center justify-center rounded-lg border text-xs font-bold transition-all
                  ${isAvailable
                    ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-400 ring-1 ring-emerald-500/20'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                  }
                  cursor-pointer hover:brightness-110`}
              >
                {day}
                {isAvailable && (
                  <div className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                )}
              </button>
            )
          }

          // ── TeamAvailabilityViewer / read-only mode: <div> ──
          return (
            <div
              key={day}
              className={`aspect-square flex items-center justify-center rounded-lg border text-xs font-bold transition-all
                ${isAvailable
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-white ring-1 ring-emerald-500/20'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                }
                cursor-default`}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}
