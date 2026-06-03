import CalendarDayCell from './CalendarDayCell'
import { getCalendarDays, toDateKey } from '../../lib/calendarUtils'

export default function CalendarGrid({
  year,
  month,
  events,
  selectedDate,
  onSelectDate,
  displayMode = 'preview-list',
  maxPreviewItems = 2,
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
            />
          )
        })}
      </div>
    </div>
  )
}
