import { Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Card from '../common/Card'
import CalendarEventDetailModal from './modals/CalendarEventDetailModal'
import CalendarEventFormModal from './modals/CalendarEventFormModal'
import CalendarFilters from './CalendarFilters'
import CalendarGrid from './grid/CalendarGrid'
import EndStreamModal from './modals/EndStreamModal'
import {
  EVENT_TYPE_CONFIG,
  THAI_MONTHS,
  filterCalendarEvents,
  getCurrentTime24,
  getEventsForDate,
  normalizeCalendarEvents,
} from '../../lib/calendarUtils'

/** ค่า Permission เริ่มต้น (ปิดทุกสิทธิ์) ใช้เป็น Fallback เมื่อ Parent ไม่ส่ง permissions มา */
const DEFAULT_PERMISSIONS = {
  canCreate: false,
  canEditStatus: false,
  canDelete: false,
  canEndStream: false,
  canViewFinancials: false,
  canFilterAllTalents: false,
}

/**
 * คอมโพเนนต์ปฏิทินหลักของระบบ (Master Calendar)
 * ทำหน้าที่รวม Logic การแสดงผลทั้งหมดเข้าด้วยกัน ได้แก่:
 * - กรอง/จัดเรียง Event จาก commissions, streams, clips ตาม role และ filterMode
 * - แสดง Grid ปฏิทินพร้อม Event preview และสีวันว่าง (Availability)
 * - จัดการ Modal สำหรับดูรายละเอียด, สร้าง Event ใหม่, และจบ Stream
 * - รองรับ 2 โหมด: VTuber (แก้ไขวันว่าง) และ Admin/Team (จัดการ Event)
 * 
 * TODO: Bug Risk - Component นี้รับ Props มากกว่า 20 ตัว (Prop Drilling ระดับสูง)
 * หากโปรเจกต์เติบโตต่อไป ควรพิจารณาแยก Context หรือ Custom Hook
 * เพื่อลดความซับซ้อนของ Props Interface ลง
 * 
 * TODO: Bug Risk - `effectiveSelectedTalentId` ถูกคำนวณใน Render Body โดยตรง
 * โดยไม่ wrap ด้วย useMemo → อาจทำให้ `visibleEvents` รีคำนวณโดยไม่จำเป็นทุก render
 * แนวทางแก้: ย้าย `effectiveSelectedTalentId` เข้า useMemo
 * 
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {'admin'|'team'|'vtuber'} props.role - Role ของผู้ใช้งานปัจจุบัน
 * @param {string} props.userId - User ID ของผู้ใช้งาน (UUID จาก Supabase Auth)
 * @param {Date} props.currentDate - วันที่ปัจจุบัน ใช้คำนวณเดือน/ปีที่แสดงในปฏิทิน
 * @param {Function} props.onMonthChange - callback เมื่อผู้ใช้กดเปลี่ยนเดือน รับ Date object
 * @param {Array<Object>} [props.commissions=[]] - รายการ Commission events
 * @param {Array<Object>} [props.streams=[]] - รายการ Stream events
 * @param {Array<Object>} [props.clips=[]] - รายการ Clip events
 * @param {Array<Object>} [props.talents=[]] - รายชื่อ VTuber ทั้งหมดสำหรับ Dropdown filter
 * @param {Array<Object>} [props.teamMembers=[]] - รายชื่อสมาชิกทีมสำหรับฟอร์มสร้าง Event
 * @param {Object|null} [props.myProfile=null] - ข้อมูลโปรไฟล์ของผู้ใช้ที่ login อยู่
 * @param {boolean} [props.loading=false] - สถานะการโหลดข้อมูลจาก Parent
 * @param {Object} [props.permissions={}] - สิทธิ์การใช้งานต่าง ๆ (canCreate, canDelete, ฯลฯ)
 * @param {string} [props.displayMode] - โหมดการแสดงผล Grid ('dots' หรือ 'preview-list')
 * @param {string[]} [props.allowedTypes] - ประเภท Event ที่อนุญาตให้สร้างได้
 * @param {Function} [props.onCreateEvent] - callback เมื่อสร้าง Event ใหม่
 * @param {Function} [props.onUpdateEvent] - callback เมื่ออัปเดต Event
 * @param {Function} [props.onDeleteEvent] - callback เมื่อลบ Event
 * @param {Function} [props.onEndStream] - callback เมื่อจบ Stream พร้อมข้อมูลรายได้
 * @param {number[]} [props.availableDays=[]] - รายการวันที่ VTuber ว่าง [1, 5, 12, ...]
 * @param {boolean} [props.isEditMode=false] - โหมดแก้ไขวันว่าง (เฉพาะ VTuber)
 * @param {Function|null} [props.onToggleDay=null] - callback เมื่อคลิกสลับวันว่าง
 * @param {Function|null} [props.onStartEdit=null] - callback เริ่มโหมดแก้ไขวันว่าง
 * @param {Function|null} [props.onSave=null] - callback บันทึกวันว่าง
 * @param {Function|null} [props.onCancel=null] - callback ยกเลิกการแก้ไขวันว่าง
 * @param {Function|null} [props.onMarkAll=null] - callback ทำเครื่องหมายว่างทุกวัน
 * @param {Function|null} [props.onMarkNone=null] - callback ล้างวันว่างทั้งหมด
 * @param {boolean} [props.savingAvailability=false] - สถานะกำลังบันทึกวันว่าง
 * @param {string} [props.filterMode] - โหมดกรอง Event ที่ควบคุมจากภายนอก
 * @param {Function} [props.onFilterModeChange] - callback เมื่อเปลี่ยนโหมดกรอง
 * @param {number|null} [props.selectedTalentId] - ID ของ VTuber ที่เลือกสำหรับกรอง (ควบคุมจากภายนอก)
 * @param {Function} [props.onSelectedTalentChange] - callback เมื่อเปลี่ยน VTuber ที่เลือก
 * @returns {React.ReactElement} การ์ดปฏิทินหลักพร้อม Grid, Filter, และ Modal ครบชุด
 */
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
  availableDays = [],
  isEditMode = false,
  onToggleDay = null,
  onStartEdit = null,
  onSave = null,
  onCancel = null,
  onMarkAll = null,
  onMarkNone = null,
  savingAvailability = false,
  filterMode: propFilterMode,
  onFilterModeChange,
  selectedTalentId: propSelectedTalentId,
  onSelectedTalentChange,
}) {
  const mergedPermissions = { ...DEFAULT_PERMISSIONS, ...permissions }

  /** State สำหรับ filterMode เมื่อไม่มี Parent ควบคุม (Uncontrolled mode) */
  const [localFilterMode, setLocalFilterMode] = useState(role === 'admin' ? 'all' : 'my-schedule')
  /** State สำหรับ selectedTalentId เมื่อไม่มี Parent ควบคุม (Uncontrolled mode) */
  const [localSelectedTalentId, setLocalSelectedTalentId] = useState(null)
  /** วันที่ที่ผู้ใช้คลิกเลือกในปฏิทิน (รูปแบบ 'YYYY-MM-DD') */
  const [selectedDate, setSelectedDate] = useState(null)
  /** สถานะการเปิด/ปิด Form Modal สร้าง Event */
  const [isFormOpen, setIsFormOpen] = useState(false)
  /** สถานะกำลังบันทึก Event ใหม่ */
  const [saving, setSaving] = useState(false)
  /** ข้อมูล Stream ที่กำลังจะจบ (เปิด EndStreamModal) */
  const [endingStream, setEndingStream] = useState(null)

  /** ใช้ค่า filterMode จาก Parent ถ้ามี ไม่งั้นใช้ local state */
  const activeFilterMode = propFilterMode ?? localFilterMode
  /** ใช้ค่า selectedTalentId จาก Parent ถ้ามี ไม่งั้นใช้ local state */
  const activeSelectedTalentId = propSelectedTalentId ?? localSelectedTalentId

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  /**
   * คำนวณจำนวนวันทั้งหมดในเดือนปัจจุบัน
   * @type {number}
   */
  const totalDaysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate()
  }, [year, month])

  /**
   * Normalize ข้อมูล Events จากทั้ง 3 แหล่ง (commissions, streams, clips)
   * ให้อยู่ในรูปแบบเดียวกันก่อนนำไปกรอง
   * @type {Array<Object>}
   */
  const normalizedEvents = useMemo(
    () => normalizeCalendarEvents({ commissions, streams, clips }),
    [commissions, streams, clips]
  )

  // TODO: Bug Risk - effectiveSelectedTalentId ถูกคำนวณใน Render Body (ไม่ใช่ใน useMemo)
  // ทำให้ค่านี้เปลี่ยนทุก render ซึ่งส่งผลให้ visibleEvents รีคำนวณโดยไม่จำเป็น
  const effectiveSelectedTalentId = activeSelectedTalentId ?? talents[0]?.id ?? null

  /**
   * กรอง normalizedEvents ตาม role, userId, filterMode และ VTuber ที่เลือก
   * @type {Array<Object>}
   */
  const visibleEvents = useMemo(
    () => filterCalendarEvents(normalizedEvents, {
      role,
      userId,
      filterMode: activeFilterMode,
      selectedTalentId: effectiveSelectedTalentId,
    }),
    [normalizedEvents, role, userId, activeFilterMode, effectiveSelectedTalentId]
  )

  /**
   * กรอง Event เฉพาะวันที่ผู้ใช้เลือก สำหรับแสดงใน CalendarEventDetailModal
   * @type {Array<Object>}
   */
  const selectedEvents = useMemo(
    () => selectedDate ? getEventsForDate(visibleEvents, selectedDate) : [],
    [visibleEvents, selectedDate]
  )

  /** โหมดการแสดงผล Grid: 'dots' สำหรับ VTuber, 'preview-list' สำหรับ Admin/Team */
  const gridDisplayMode = displayMode ?? (role === 'vtuber' ? 'dots' : 'preview-list')

  /**
   * จัดการการเลือกวันในปฏิทิน
   * VTuber: toggle (คลิกซ้ำจะยกเลิกการเลือก), Admin/Team: เลือกปกติ
   * 
   * @param {string} dateStr - วันที่ที่คลิก รูปแบบ 'YYYY-MM-DD'
   */
  const handleSelectDate = (dateStr) => {
    if (role === 'vtuber') {
      setSelectedDate(prev => prev === dateStr ? null : dateStr)
      return
    }
    setSelectedDate(dateStr)
  }

  /** เปิด Form Modal สำหรับสร้าง Event ใหม่ */
  const handleCreateClick = () => setIsFormOpen(true)

  /**
   * บันทึก Event ใหม่ผ่าน callback onCreateEvent จาก Parent
   * 
   * @param {string} type - ประเภท Event ('stream', 'clip', 'commission')
   * @param {Object} payload - ข้อมูล Event ที่กรอกในฟอร์ม
   */
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

  /**
   * จบ Stream พร้อมบันทึกเวลาสิ้นสุดและรายได้
   * 
   * @param {Object} param - ข้อมูลการจบ Stream
   * @param {string} param.endTime - เวลาสิ้นสุด (HH:MM)
   * @param {number} param.revenue - รายได้จาก Stream (บาท)
   */
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

      {/* ── Footer: Legend, สถิติวันว่าง, และปุ่มควบคุม Availability ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mx-3 mb-3 pt-3 border-t border-white/[0.04]">

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
