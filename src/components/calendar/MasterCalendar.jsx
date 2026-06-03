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
}) {
  const mergedPermissions = { ...DEFAULT_PERMISSIONS, ...permissions }
  const [filterMode, setFilterMode] = useState(role === 'admin' ? 'all' : 'my-schedule')
  const [selectedTalentId, setSelectedTalentId] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [endingStream, setEndingStream] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const normalizedEvents = useMemo(() => normalizeCalendarEvents({ commissions, streams, clips }), [commissions, streams, clips])
  const effectiveSelectedTalentId = selectedTalentId ?? talents[0]?.id ?? null
  const visibleEvents = useMemo(() => filterCalendarEvents(normalizedEvents, {
    role,
    userId,
    filterMode,
    selectedTalentId: effectiveSelectedTalentId,
  }), [normalizedEvents, role, userId, filterMode, effectiveSelectedTalentId])

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
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
        talents={talents}
        selectedTalentId={effectiveSelectedTalentId}
        onSelectedTalentChange={setSelectedTalentId}
      />

      <CalendarGrid
        year={year}
        month={month}
        events={visibleEvents}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        displayMode={gridDisplayMode}
      />

      {gridDisplayMode === 'dots' && (
        <div className="flex items-center gap-4 mx-3 mb-3 pt-3 border-t border-white/[0.04]">
          {['stream', 'clip'].map(type => (
            <div key={type} className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className={`w-2 h-2 rounded-full ${EVENT_TYPE_CONFIG[type].markerClass}`} />
              {EVENT_TYPE_CONFIG[type].iconLabel}
            </div>
          ))}
        </div>
      )}

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
