import CalendarDayCell from './CalendarDayCell'
import { getCalendarDays, toDateKey } from '../../../lib/calendarUtils'

/**
 * แสดง Calendar Grid รายเดือนและส่งข้อมูลแต่ละวันต่อให้ CalendarDayCell
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {number} props.year - ปี ค.ศ. ที่ต้องการแสดงในปฏิทิน
 * @param {number} props.month - เดือนที่ต้องการแสดง โดยใช้ index แบบ JavaScript Date (0-11)
 * @param {Array<Object>} props.events - รายการ Event ทั้งหมดสำหรับเดือนหรือช่วงที่กำลังแสดง
 * @param {string|null} props.selectedDate - วันที่ที่ผู้ใช้เลือกอยู่ รูปแบบ YYYY-MM-DD
 * @param {Function} props.onSelectDate - callback เมื่อผู้ใช้เลือกวันที่ รับ date key รูปแบบ YYYY-MM-DD
 * @param {'preview-list'|'dots'} [props.displayMode='preview-list'] - โหมดการแสดง Event ในแต่ละช่องวันที่
 * @param {number} [props.maxPreviewItems=2] - จำนวน Event สูงสุดที่แสดงในแต่ละช่องเมื่อใช้โหมด preview-list
 * @param {number[]} [props.availableDays=[]] - รายการเลขวันที่ที่ VTuber สามารถทำงานได้
 * @param {boolean} [props.isEditMode=false] - ระบุว่า Grid อยู่ในโหมดแก้ไขวันว่างหรือไม่
 * @param {Function|null} [props.onToggleDay=null] - callback เมื่อคลิกสลับสถานะวันว่างในโหมดแก้ไข
 * @returns {React.ReactElement} Grid ปฏิทินรายเดือนพร้อมช่องวันที่และรายการ Event แบบย่อ
 */
export default function CalendarGrid({
  year,
  month,
  events,
  selectedDate,
  onSelectDate,
  displayMode = 'preview-list',
  maxPreviewItems = 2,
  availableDays = [],     // ✨ วันที่ available สำหรับแสดงสีเขียว
  isEditMode = false,     // ✨ โหมดแก้ไข
  onToggleDay = null,     // ✨ callback เมื่อคลิกวัน
}) {
  const calendarDays = getCalendarDays(year, month)
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="p-3">
      <div className="grid grid-cols-7 mb-1">
        {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map(day => (
          <div key={day} className="text-center text-[10px] font-bold text-slate-500 py-1">{day}</div>
        ))}
      </div>
      <div className={`grid grid-cols-7 ${displayMode === 'dots' ? 'gap-1' : 'gap-[3px]'}`}>
        {calendarDays.map((day, index) => {
          if (!day) return <div key={`blank-${index}`} />
          const dateStr = toDateKey(year, month, day)
          return (
            
            <CalendarDayCell
              key={dateStr}
              day={day}
              dateStr={dateStr}
              events={events}
              isToday={dateStr === todayStr}
              isSelected={dateStr === selectedDate}
              onClick={() => onSelectDate(dateStr)}
              displayMode={displayMode}
              maxPreviewItems={maxPreviewItems}
              availableDays={availableDays}
              isEditMode={isEditMode}
              onToggleDay={onToggleDay}
            />
          )
        })}
      </div>
    </div>
  )
}
