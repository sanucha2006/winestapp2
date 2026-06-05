import { Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Card from '../common/Card'
import CalendarEventDetailModal from './CalendarEventDetailModal'
import CalendarEventFormModal from './CalendarEventFormModal'
import CalendarFilters from './CalendarFilters'
import CalendarGrid from './CalendarGrid'
import EndStreamModal from './EndStreamModal'
import {
  EVENT_TYPE_CONFIG,
  THAI_MONTHS,
  filterCalendarEvents,
  getCurrentTime24,
  getEventsForDate,
  normalizeCalendarEvents,
} from '../../lib/calendarUtils'

const DEFAULT_PERMISSIONS = {
  canCreate: false,
  canEditStatus: false,
  canDelete: false,
  canEndStream: false,
  canViewFinancials: false,
  canFilterAllTalents: false,
}

export default function MasterCalendar({
  role,
  userId,
  currentDate,
  onMonthChange,
  commissions = [],
  streams = [],
  clips = [],
  talents = [],
  teamMembers = [],
  myProfile = null,
  loading = false,
  permissions = {},
  displayMode,
  allowedTypes,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onEndStream,
  availableDays = [],     // ✨ วันที่ available สำหรับแสดงสีเขียว
  isEditMode = false,     // ✨ โหมดแก้ไข
  onToggleDay = null,     // ✨ callback เมื่อคลิกวัน
  onStartEdit = null,     // ✨ callback เริ่มแก้ไข
  onSave = null,          // ✨ callback บันทึก
  onCancel = null,        // ✨ callback ยกเลิก
  onMarkAll = null,       // ✨ callback ว่างทุกวัน
  onMarkNone = null,      // ✨ callback ไม่ว่างเลย
  savingAvailability = false, // ✨ กำลังบันทึก
  filterMode: propFilterMode,                  // ✨ [NEW] คุมโหมดฟิลเตอร์จากภายนอก
  onFilterModeChange,                          // ✨ [NEW] callback เมื่อเปลี่ยนโหมดฟิลเตอร์
  selectedTalentId: propSelectedTalentId,      // ✨ [NEW] คุม VTuber ที่เลือกจากภายนอก
  onSelectedTalentChange,                      // ✨ [NEW] callback เมื่อเปลี่ยนตัวเลือก VTuber
}) {
  const mergedPermissions = { ...DEFAULT_PERMISSIONS, ...permissions }
  const [localFilterMode, setLocalFilterMode] = useState(role === 'admin' ? 'all' : 'my-schedule')
  const [localSelectedTalentId, setLocalSelectedTalentId] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [endingStream, setEndingStream] = useState(null)

  const activeFilterMode = propFilterMode ?? localFilterMode
  const activeSelectedTalentId = propSelectedTalentId ?? localSelectedTalentId

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const totalDaysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate()
  }, [year, month])

  const normalizedEvents = useMemo(() => normalizeCalendarEvents({ commissions, streams, clips }), [commissions, streams, clips])
  const effectiveSelectedTalentId = activeSelectedTalentId ?? talents[0]?.id ?? null
  const visibleEvents = useMemo(() => filterCalendarEvents(normalizedEvents, {
    role,
    userId,
    filterMode: activeFilterMode,
    selectedTalentId: effectiveSelectedTalentId,
  }), [normalizedEvents, role, userId, activeFilterMode, effectiveSelectedTalentId])

  const selectedEvents = useMemo(() => selectedDate ? getEventsForDate(visibleEvents, selectedDate) : [], [visibleEvents, selectedDate])
  const gridDisplayMode = displayMode ?? (role === 'vtuber' ? 'dots' : 'preview-list')

  const handleSelectDate = (dateStr) => {
    if (role === 'vtuber') {
      setSelectedDate(prev => prev === dateStr ? null : dateStr)
      return
    }
    setSelectedDate(dateStr)
  }

  const handleCreateClick = () => setIsFormOpen(true)

  const handleCreateEvent = async (type, payload) => {
    if (!onCreateEvent || !selectedDate) return
    setSaving(true)
    try {
      await onCreateEvent(type, payload, selectedDate)
      setIsFormOpen(false)
    } catch (error) {
      alert('บันทึกไม่สำเร็จ: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEndStream = async ({ endTime, revenue }) => {
    if (!endingStream || !onEndStream) return
    await onEndStream(endingStream, { endTime, revenue })
    setEndingStream(null)
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Calendar size={14} className={role === 'vtuber' ? 'text-violet-400' : 'text-indigo-400'} />
          {role === 'vtuber' ? 'ตารางคิวงาน' : 'Master Calendar'}
          {loading && <Loader2 size={13} className="text-slate-500 animate-spin" />}
        </span>
        <div className="flex items-center gap-1.5 bg-[#161622] px-2.5 py-1 rounded-lg border border-white/[0.06]">
          <button type="button" onClick={() => onMonthChange(new Date(year, month - 1, 1))} className="p-0.5 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-bold text-slate-200 min-w-[108px] text-center select-none">
            {THAI_MONTHS[month]} {year}
          </span>
          <button type="button" onClick={() => onMonthChange(new Date(year, month + 1, 1))} className="p-0.5 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <CalendarFilters
        role={role}
        filterMode={activeFilterMode}
        onFilterModeChange={(val) => {
          if (onFilterModeChange) onFilterModeChange(val)
          else setLocalFilterMode(val)
        }}
        talents={talents}
        selectedTalentId={effectiveSelectedTalentId}
        onSelectedTalentChange={(val) => {
          const numericId = val ? Number(val) : null
          if (onSelectedTalentChange) onSelectedTalentChange(numericId)
          else setLocalSelectedTalentId(numericId)
        }}
      />

      <CalendarGrid
        year={year}
        month={month}
        events={visibleEvents}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        displayMode={gridDisplayMode}
        availableDays={availableDays}
        isEditMode={isEditMode}
        onToggleDay={onToggleDay}
      />

      {/* Footer Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mx-3 mb-3 pt-3 border-t border-white/[0.04]">
        
        {/* Left Side: Legend & Statistics */}
        <div className="flex flex-wrap items-center gap-3">
          {gridDisplayMode === 'dots' && (
            <div className="flex items-center gap-3">
              {['stream', 'clip'].map(type => (
                <div key={type} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className={`w-2 h-2 rounded-full ${EVENT_TYPE_CONFIG[type].markerClass}`} />
                  {EVENT_TYPE_CONFIG[type].iconLabel}
                </div>
              ))}
            </div>
          )}

          {/* Availability statistics for VTuber */}
          {role === 'vtuber' && (
            <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-white/[0.02] border border-white/[0.04] px-2.5 py-1 rounded-lg">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ว่าง: <strong className="text-emerald-400 font-bold">{availableDays.length}</strong> วัน
              </span>
              <span className="text-white/10">|</span>
              <span>
                ไม่ว่าง: <strong className="text-slate-200">{totalDaysInMonth - availableDays.length}</strong> วัน
              </span>
            </div>
          )}
        </div>

        {/* Right Side: VTuber Availability Controls */}
        {role === 'vtuber' && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {!isEditMode ? (
              <button
                type="button"
                onClick={onStartEdit}
                className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 transition-all hover:shadow-md hover:shadow-emerald-950/20 cursor-pointer"
              >
                <Calendar size={11} />
                แก้ไขวันทำงาน
              </button>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={onMarkAll}
                  className="text-[9px] font-bold px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                >
                  ว่างทุกวัน
                </button>
                <button
                  type="button"
                  onClick={onMarkNone}
                  className="text-[9px] font-bold px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                >
                  ไม่ว่างเลย
                </button>
                <div className="w-px h-4 bg-white/10 mx-0.5" />
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={savingAvailability}
                  className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {savingAvailability && <Loader2 size={11} className="animate-spin" />}
                  บันทึก
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedDate && (
        <CalendarEventDetailModal
          date={selectedDate}
          events={selectedEvents}
          role={role}
          permissions={mergedPermissions}
          myProfile={myProfile}
          onClose={() => setSelectedDate(null)}
          onCreateClick={handleCreateClick}
          onUpdateEvent={onUpdateEvent}
          onDeleteEvent={onDeleteEvent}
          onEndStreamClick={event => setEndingStream(event)}
        />
      )}

      {isFormOpen && selectedDate && (
        <CalendarEventFormModal
          date={selectedDate}
          talents={talents}
          teamMembers={teamMembers}
          currentUserId={userId}
          myProfile={myProfile}
          allowedTypes={allowedTypes}
          saving={saving}
          onSubmit={handleCreateEvent}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      {endingStream && (
        <EndStreamModal
          stream={endingStream}
          defaultEndTime={endingStream.endTime || getCurrentTime24()}
          defaultRevenue={endingStream.revenue || 0}
          onSubmit={handleEndStream}
          onClose={() => setEndingStream(null)}
        />
      )}
    </Card>
  )
}
