import { EVENT_TYPE_CONFIG, getEventsForDate } from '../../../lib/calendarUtils'

/**
 * แสดงช่องวันที่หนึ่งช่องใน Calendar Grid พร้อมสถานะวันนี้ วันที่เลือก วันว่าง และรายการ Event แบบย่อ
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {number} props.day - เลขวันที่ในเดือนที่ต้องการแสดง
 * @param {string} props.dateStr - วันที่รูปแบบ YYYY-MM-DD สำหรับใช้ค้นหา Event และตรวจสถานะวันที่เลือก
 * @param {Array<Object>} props.events - รายการ Event ทั้งหมดที่ส่งมาจาก Calendar Grid
 * @param {boolean} props.isToday - ระบุว่าช่องนี้เป็นวันที่ปัจจุบันหรือไม่
 * @param {boolean} props.isSelected - ระบุว่าช่องนี้เป็นวันที่ผู้ใช้เลือกอยู่หรือไม่
 * @param {Function} props.onClick - callback เมื่อคลิกช่องวันที่ในโหมดปกติ
 * @param {'preview-list'|'dots'} [props.displayMode='preview-list'] - โหมดการแสดง Event ภายในช่องวันที่
 * @param {number} [props.maxPreviewItems=2] - จำนวน Event สูงสุดที่แสดงในโหมด preview-list
 * @param {number[]} [props.availableDays=[]] - รายการเลขวันที่ที่ VTuber สามารถทำงานได้
 * @param {boolean} [props.isEditMode=false] - ระบุว่าอยู่ในโหมดแก้ไขวันว่างหรือไม่
 * @param {Function|null} [props.onToggleDay=null] - callback เมื่อคลิกสลับสถานะวันว่างในโหมดแก้ไข
 * @returns {React.ReactElement} ช่องวันที่สำหรับ Calendar Grid พร้อม Event preview หรือ dot indicators
 */
export default function CalendarDayCell({
  day,
  dateStr,
  events,
  isToday,
  isSelected,
  onClick,
  displayMode = 'preview-list',
  maxPreviewItems = 2,
  availableDays = [],     // ✨ วันที่ VTuber สามารถทำงานได้ [1, 5, 12, 25]
  isEditMode = false,     // ✨ โหมดแก้ไข - รับการคลิก
  onToggleDay = null,     // ✨ callback เมื่อคลิกวัน (edit mode)
}) {
  
  const dayEvents = getEventsForDate(events, dateStr)
  const isAvailable = availableDays.includes(day) // ✨ วันนี้ว่างไหม

  // ✨ สีเขียวสำหรับวันว่าง (โหมดแก้ไข) / สีขาวสว่าง (โหมดปกติ)
  const availabilityClass = isAvailable
    ? isEditMode
      ? 'bg-emerald-500/20 border-emerald-400/60 ring-1 ring-emerald-500/20'
      : 'bg-white/10 border-white/15 shadow-sm'
    : 'bg-white/5 border-white/[0.05]'

  if (displayMode === 'dots') {
    
    const eventTypes = [...new Set(dayEvents.map(event => event.type))]
    return (
      <button
        type="button"
        onClick={() => {
          if (isEditMode && onToggleDay) {
            onToggleDay(day)
          } else {
            onClick?.()
          }
        }}
        className={`min-h-[44px] p-1 rounded-lg border flex flex-col items-start justify-between text-left transition-all
          ${isEditMode
            ? availabilityClass
            : isSelected
              ? 'bg-violet-600/15 border-violet-400/50 ring-1 ring-violet-500/30'
              : isToday
                ? 'bg-violet-600/10 border-violet-500/40 text-violet-400 font-bold'
                : isAvailable
                  ? `${availabilityClass} hover:bg-white/20`
                  : 'bg-[#13131f] border-white/[0.04] text-slate-400 hover:border-violet-500/30'}`}
      >
        <span className={`text-[11px] font-bold px-0.5 ${
          isToday ? 'text-violet-400' :
          isAvailable
            ? isEditMode ? 'text-emerald-400' : 'text-white'
            : 'text-slate-400'
        }`}>{day}</span>
        <div className="flex gap-0.5 px-0.5 pb-0.5">
          {eventTypes.map(type => (
            <span key={type} className={`w-1.5 h-1.5 rounded-full shadow ${EVENT_TYPE_CONFIG[type]?.markerClass ?? 'bg-slate-400'}`} />
          ))}
        </div>
      </button>
    )
  }

  const overflow = dayEvents.length > maxPreviewItems ? dayEvents.length - maxPreviewItems : 0

  return (
    <div
      onClick={() => {
        if (isEditMode && onToggleDay) {
          onToggleDay(day)
        } else {
          onClick?.()
        }
      }}
      className={`min-h-[68px] p-1.5 rounded-lg border flex flex-col gap-[3px] cursor-pointer transition-all hover:brightness-125
        ${isEditMode
          ? `${availabilityClass} ${isAvailable ? 'hover:bg-emerald-500/30' : 'hover:bg-emerald-500/15'}`
          : isSelected
            ? 'bg-indigo-900/30 border-indigo-400/60 ring-1 ring-indigo-500/30'
            : isToday
              ? 'bg-indigo-900/25 border-indigo-500/40'
              : isAvailable
                ? `${availabilityClass} hover:bg-emerald-500/30`
                : 'bg-[#13131e] border-white/[0.05] hover:border-white/10'}`}
    >
      <span className={`text-[11px] font-bold leading-none ${
        isAvailable ? 'text-white' :
        isToday ? 'text-indigo-400' : 'text-slate-400'
      }`}>{day}</span>
      {!isEditMode && (
        <div className="flex-1 space-y-[2px] overflow-hidden">
          {dayEvents.slice(0, maxPreviewItems).map(event => {
            const cfg = EVENT_TYPE_CONFIG[event.type]
            return (
              <div key={`${event.type}-${event.id}`} className={`text-[9px] px-1 py-[1px] rounded border truncate leading-tight ${cfg?.previewClass ?? 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                {cfg?.previewPrefix ?? 'EVT'} {event.title}
              </div>
            )
          })}
          {overflow > 0 && <div className="text-[9px] text-slate-500 font-bold px-1">+{overflow} more</div>}
        </div>
      )}
    </div>
  )
}
