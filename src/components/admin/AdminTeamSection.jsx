// src/components/admin/AdminTeamSection.jsx
// ─────────────────────────────────────────────────────────────
// Tab 2 — Team Oversight Dashboard + Calendar
// แสดง Workload Metrics และ MasterCalendar (role=admin)
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { Users, Layers, ListChecks, Clock } from 'lucide-react'
import MetricCard from '../common/MetricCard'
import Spinner from '../common/Spinner'
import MasterCalendar from '../calendar/MasterCalendar'


const ADMIN_CALENDAR_PERMISSIONS = {
  canCreate:          true,
  canEditStatus:      true,
  canDelete:          true,
  canEndStream:       false,
  canViewFinancials:  true,
  canFilterAllTalents: false, // ซ่อน VTuber Dropdown ใน Team Dashboard
}

/**
 * แสดงแท็บ Admin Team Oversight พร้อม workload metrics และ MasterCalendar สำหรับงานของทีม
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {Array<Object>} props.teamMembers - รายชื่อสมาชิกทีม [{ id, display_name, role }]
 * @param {Array<Object>} props.talents - รายชื่อ VTuber
 * @param {string} props.userId - Admin user UUID
 * @param {Object|null} props.myProfile - โปรไฟล์ Admin ที่ login อยู่
 * @param {Array<Object>} props.commissions - รายการ commission สำหรับคำนวณ workload และแสดงบน calendar
 * @param {Array<Object>} props.streams - รายการ stream สำหรับแสดงบน calendar
 * @param {Array<Object>} props.clips - รายการ clip สำหรับแสดงบน calendar
 * @param {boolean} props.loadingCalendar - สถานะโหลดข้อมูล calendar
 * @param {Date} props.calMonth - เดือนที่กำลังแสดงใน calendar
 * @param {Function} props.onMonthChange - callback เมื่อเปลี่ยนเดือน
 * @param {Function} props.onCreateEvent - callback สำหรับสร้าง Event
 * @param {Function} props.onUpdateEvent - callback สำหรับอัปเดต Event
 * @param {Function} props.onDeleteEvent - callback สำหรับลบ Event
 * @param {number} [props.refreshKey=0] - key สำหรับบังคับ refresh จากหน้า Admin หลัก
 * @returns {React.ReactElement} Section สำหรับดูแล workload ของทีมในหน้า Admin
 */
export default function AdminTeamSection({
  teamMembers = [],
  talents = [],
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
  refreshKey = 0,
}) {
  const [selectedMemberId, setSelectedMemberId] = useState(null) // null = ทั้งทีม
  const [workload, setWorkload] = useState(null)
  const [loadingWorkload, setLoadingWorkload] = useState(false)

  const filteredCommissions = commissions.filter(c => {
    if (!selectedMemberId) return true
    return c.ownerId === selectedMemberId || c.partners?.some(p => p.userId === selectedMemberId)
  })

  useEffect(() => {
    setLoadingWorkload(true)
    
    const activeProjects = filteredCommissions.filter(c => c.status !== 'done' && c.status !== 'cancelled').length
    const totalCommissions = filteredCommissions.filter(c => c.status !== 'cancelled').length
    const pendingCount = filteredCommissions.filter(c => c.status === 'pending').length
    const inProgressCount = filteredCommissions.filter(c => c.status === 'in_progress').length

    setWorkload({
      activeProjects,
      totalCommissions,
      pendingCount,
      inProgressCount,
    })
    
    setLoadingWorkload(false)
  }, [selectedMemberId, commissions])

  /**
   * เปลี่ยนสมาชิกทีมที่ใช้กรอง workload และ commission บน calendar
   *
   * @param {React.ChangeEvent<HTMLSelectElement>} e - event จาก select รายชื่อสมาชิกทีม
   * @returns {void} ไม่มีค่า return
   */
  const handleMemberChange = useCallback((e) => {
    const val = e.target.value
    setSelectedMemberId(val || null)
  }, [])

  // จำกัดตัวเลือก selector ให้เหลือเฉพาะสมาชิกทีมจริง ไม่รวม admin/vtuber
  const teamOnly = teamMembers.filter(m => m.role === 'team')

  return (
    <div className="space-y-4">
      {/* ── Selector ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[#0d0d16] border border-white/[0.05] rounded-xl px-3 py-2">
          <Users size={13} className="text-indigo-400 shrink-0" />
          <select
            value={selectedMemberId ?? ''}
            onChange={handleMemberChange}
            className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer pr-2"
          >
            <option value="" className="bg-[#0d0d16] text-slate-200">ภาพรวมทีมทั้งหมด</option>
            {teamOnly.map(m => (
              <option key={m.id} value={m.id} className="bg-[#0d0d16] text-slate-200">{m.display_name}</option>
            ))}
          </select>
        </div>
        <span className="text-[10px] text-slate-500">
          {selectedMemberId ? 'กำลังดูข้อมูลรายบุคคล' : `${teamOnly.length} สมาชิกทีม`}
        </span>
      </div>

      {/* ── Workload Metrics ── */}
      {loadingWorkload ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            icon={Layers}
            label="Active Projects"
            value={workload?.activeProjects ?? 0}
            subtitle="งานที่ยังไม่ done"
            color="indigo"
          />
          <MetricCard
            icon={ListChecks}
            label="งานทั้งหมด"
            value={workload?.totalCommissions ?? 0}
            subtitle="commission ที่ไม่ถูก cancel"
            color="violet"
          />
          <MetricCard
            icon={Clock}
            label="รอดำเนินการ"
            value={workload?.pendingCount ?? 0}
            subtitle="สถานะ pending"
            color="amber"
          />
          <MetricCard
            icon={Users}
            label="กำลังดำเนินการ"
            value={workload?.inProgressCount ?? 0}
            subtitle="สถานะ in_progress"
            color="cyan"
          />
        </div>
      )}

      {/* ── Team Calendar ── */}
      <MasterCalendar
        role="admin"
        userId={userId}
        currentDate={calMonth}
        onMonthChange={onMonthChange}
        commissions={filteredCommissions}
        streams={streams}
        clips={clips}
        talents={talents}
        teamMembers={teamMembers}
        myProfile={myProfile}
        loading={loadingCalendar}
        permissions={ADMIN_CALENDAR_PERMISSIONS}
        allowedTypes={['commission', 'stream', 'clip']}
        filterMode="all"
        onCreateEvent={onCreateEvent}
        onUpdateEvent={onUpdateEvent}
        onDeleteEvent={onDeleteEvent}
      />
    </div>
  )
}
