// src/components/admin/AdminVTuberSection.jsx
// ─────────────────────────────────────────────────────────────
// Tab 1 — VTuber Oversight Dashboard + Calendar
// แสดง Metrics (Revenue, Stream Hours, Clips, Quest Ratio)
// และ MasterCalendar ที่ปลดล็อก Admin permissions
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { Users, Wallet, Tv2, Film, Trophy } from 'lucide-react'
import MetricCard from '../common/MetricCard'
import Spinner from '../common/Spinner'
import MasterCalendar from '../calendar/MasterCalendar'
import { getMonthlyQuests } from '../../lib/adminService'
import { toMonthKey } from '../../lib/calendarUtils'

/** สิทธิ์ของ Admin สำหรับใช้งาน MasterCalendar ในแท็บ VTuber Oversight */
const ADMIN_CALENDAR_PERMISSIONS = {
  canCreate:          true,
  canEditStatus:      true,
  canDelete:          true,
  canEndStream:       true,
  canViewFinancials:  true,
  canFilterAllTalents: false,
}

/**
 * แสดงแท็บ Admin VTuber Oversight พร้อม metrics รายบุคคล/ภาพรวม และ MasterCalendar สำหรับจัดการ stream/clip
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {Array<Object>} props.talents - รายชื่อ VTuber ทั้งหมด
 * @param {Array<Object>} props.teamMembers - รายชื่อสมาชิกทีม (สำหรับ dropdown assign)
 * @param {string} props.userId - Admin user UUID
 * @param {Object|null} props.myProfile - Admin profile
 * @param {Array<Object>} props.commissions - Commission events
 * @param {Array<Object>} props.streams - Stream events
 * @param {Array<Object>} props.clips - Clip events
 * @param {boolean} props.loadingCalendar - สถานะโหลดข้อมูล calendar
 * @param {Date} props.calMonth - เดือนที่กำลังแสดงใน calendar
 * @param {Function} props.onMonthChange - callback เมื่อเปลี่ยนเดือน
 * @param {Function} props.onCreateEvent - callback สำหรับสร้าง Event
 * @param {Function} props.onUpdateEvent - callback สำหรับอัปเดต Event
 * @param {Function} props.onDeleteEvent - callback สำหรับลบ Event
 * @param {Function} props.onEndStream - callback สำหรับบันทึกจบ stream
 * @param {number} [props.refreshKey=0] - key สำหรับบังคับ reload metrics เมื่อกด Refresh
 * @returns {React.ReactElement} Section สำหรับดูแล VTuber ในหน้า Admin
 */
export default function AdminVTuberSection({
  talents = [],
  teamMembers = [],
  userId,
  myProfile,
  commissions = [],
  streams = [],
  clips = [],
  loadingCalendar = false,
  calMonth,
  onMonthChange,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onEndStream,
  refreshKey = 0,
}) {
  const [selectedTalentId, setSelectedTalentId] = useState(null) // null = All
  const [metrics, setMetrics] = useState({
    grossRevenue: 0,
    streamMinutes: 0,
    clipsCount: 0,
    questDone: 0,
    questTotal: 0
  })
  const [loadingMetrics, setLoadingMetrics] = useState(false)

  const [quests, setQuests] = useState([])

  const monthKey = toMonthKey(calMonth)

  // โหลด quest transactions รายเดือนเพื่อใช้คำนวณ metric โดยไม่ query ซ้ำเมื่อเปลี่ยนตัวกรอง
  useEffect(() => {
    let isMounted = true
    getMonthlyQuests(monthKey)
      .then(data => { if (isMounted) setQuests(data) })
      .catch(console.error)
    return () => { isMounted = false }
  }, [monthKey, refreshKey])

  // คำนวณ metrics จากข้อมูลที่ parent โหลดมาแล้วและ quest transactions ที่ cache ใน state
  useEffect(() => {
    setLoadingMetrics(true)
    
    const filteredStreams = selectedTalentId ? streams.filter(s => s.talentId === selectedTalentId) : streams
    const filteredClips   = selectedTalentId ? clips.filter(c => c.talentId === selectedTalentId) : clips
    const filteredQuests  = selectedTalentId ? quests.filter(q => q.talent_id === selectedTalentId) : quests

    let grossRevenue = 0
    let streamMinutes = 0

    for (const s of filteredStreams) {
      if (s.status === 'done') {
        grossRevenue += Number(s.revenue) || 0
        if (s.time && s.endTime) {
          const [sh, sm] = s.time.split(':').map(Number)
          const [eh, em] = s.endTime.split(':').map(Number)
          streamMinutes += (eh * 60 + em) - (sh * 60 + sm)
        }
      }
    }

    setMetrics({
      grossRevenue,
      streamMinutes: Math.max(0, streamMinutes),
      clipsCount: filteredClips.length,
      questDone: filteredQuests.filter(q => q.is_done).length,
      questTotal: filteredQuests.length
    })
    
    setLoadingMetrics(false)
  }, [selectedTalentId, streams, clips, quests])

  /**
   * เปลี่ยน VTuber ที่ใช้กรอง metrics และ calendar ในแท็บนี้
   *
   * @param {React.ChangeEvent<HTMLSelectElement>} e - event จาก select รายชื่อ VTuber
   * @returns {void} ไม่มีค่า return
   */
  const handleTalentChange = useCallback((e) => {
    const val = e.target.value
    setSelectedTalentId(val ? Number(val) : null)
  }, [])

  const companyShare = (metrics?.grossRevenue ?? 0) * 0.6
  const talentShare  = (metrics?.grossRevenue ?? 0) * 0.4

  const totalMin = metrics?.streamMinutes ?? 0
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  let streamTimeText = `${h} ชม. ${m} นาที`
  if (h === 0) streamTimeText = `${m} นาที`
  if (m === 0 && h > 0) streamTimeText = `${h} ชม.`
  if (totalMin === 0) streamTimeText = `0 ชม.`

  return (
    <div className="space-y-4">
      {/* ── Selector ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[#0d0d16] border border-white/[0.05] rounded-xl px-3 py-2">
          <Users size={13} className="text-violet-400 shrink-0" />
          <select
            value={selectedTalentId ?? ''}
            onChange={handleTalentChange}
            className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer pr-2"
          >
            <option value="" className="bg-[#0d0d16] text-slate-200">ภาพรวมทั้งหมด (Active)</option>
            {talents.map(t => (
              <option key={t.id} value={t.id} className="bg-[#0d0d16] text-slate-200">{t.talent_name}</option>
            ))}
          </select>
        </div>
        <span className="text-[10px] text-slate-500">
          {selectedTalentId ? 'กำลังดูข้อมูลรายบุคคล' : `${talents.length} VTuber`}
        </span>
      </div>

      {/* ── Metrics Row ── */}
      {loadingMetrics ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            icon={Wallet}
            label="รายได้ทังหมด"
            value={`฿${(metrics?.grossRevenue ?? 0).toLocaleString()}`}
            subtitle={`บริษัท: ฿${companyShare.toLocaleString()} | VTuber: ฿${talentShare.toLocaleString()}`}
            color="violet"
          />
          <MetricCard
            icon={Tv2}
            label="ชั่วโมงไลฟ์"
            value={streamTimeText}
            subtitle="รวมทุก stream ที่จบแล้ว"
            color="indigo"
          />
          <MetricCard
            icon={Film}
            label="จำนวนคลิป"
            value={metrics?.clipsCount ?? 0}
            subtitle="คลิปสั้นและคลิปยาว"
            color="cyan"
          />
          <MetricCard
            icon={Trophy}
            label="Quest Ratio"
            value={`${metrics?.questDone ?? 0} / ${metrics?.questTotal ?? 0}`}
            subtitle="เควสที่สำเร็จ / เควสทั้งหมด"
            color="amber"
          />
        </div>
      )}

      {/* ── Operational Calendar ── */}
      <MasterCalendar
        role="admin"
        userId={userId}
        currentDate={calMonth}
        onMonthChange={onMonthChange}
        commissions={[]} // แท็บนี้โฟกัส stream/clip จึงไม่แสดง commission บน calendar
        streams={streams}
        clips={clips}
        talents={talents}
        teamMembers={teamMembers}
        myProfile={myProfile}
        loading={loadingCalendar}
        permissions={ADMIN_CALENDAR_PERMISSIONS}
        allowedTypes={['stream', 'clip']}
        onCreateEvent={onCreateEvent}
        onUpdateEvent={onUpdateEvent}
        onDeleteEvent={onDeleteEvent}
        onEndStream={onEndStream}
        selectedTalentId={selectedTalentId}
        filterMode={selectedTalentId ? 'specific-vtuber' : 'all'}
        onSelectedTalentChange={setSelectedTalentId}
      />
    </div>
  )
}
