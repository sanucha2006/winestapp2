// src/pages/TeamDashboard.jsx
// ─────────────────────────────────────────────────────────────
// หน้า Dashboard หลักของทีม Staff
// Root component: จัดการ state กลาง, โหลดข้อมูล, และส่ง props ลง Tab ย่อย
// ประกอบด้วย 3 Tab:
//   1. Master Calendar  — ตารางงานรายเดือน พร้อมเพิ่ม/แก้ไขงาน
//   2. VTuber Checklist — ติดตาม thumbnails และ scripts
//   3. Team Pipeline    — Kanban + สรุปรายได้รายเดือน
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import {
  Layers, Calendar, CheckCircle2, Loader2,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import MasterCalendar from '../components/calendar/MasterCalendar'
import { toMonthKey } from '../lib/calendarUtils'
import {
  getCommissions, createCommission, updateCommissionStatus, deleteCommission,
  getStreams, createStream, toggleStreamThumbnail as dbToggleStreamThumb, endStream, deleteStream,
  getClips, createClip, toggleClipScript as dbToggleClipScript, toggleClipThumbnail as dbToggleClipThumb,
  updateClipStatus, deleteClip,
  getTalents, getMyProfile, getTeamMembers,
  mapCommission, mapStream, mapClip,
  getVTuberAvailability,
} from '../lib/supabaseservice'

// ── Extracted Components ──
import Spinner from '../components/common/Spinner'
import VTuberChecklistTab from '../components/team/VTuberChecklistTab'
import TeamPipelineTab from '../components/team/TeamPipelineTab'

// ══════════════════════════════════════════════════════════════
// 🟪 Root Component — TeamDashboard
// จัดการ state กลาง, โหลดข้อมูล, และส่ง props ลง Tab ย่อย
// ══════════════════════════════════════════════════════════════
export default function TeamDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('calendar')

  // ── ข้อมูลหลัก (โหลดจาก Supabase) ──────────────────────────
  const [myProfile,   setMyProfile]   = useState(null)  // profiles row ของ user ที่ login
  const [talents,     setTalents]     = useState([])    // [{ id, talent_name }] ทุก VTuber
  const [teamMembers, setTeamMembers] = useState([])    // สมาชิกทีมสำหรับ dropdown แบ่งรายได้
  const [teamTasks,   setTeamTasks]   = useState([])    // commission ทั้งหมดที่เกี่ยวข้องกับ user
  const [streams,     setStreams]     = useState([])    // ตารางสตรีมของเดือนนั้น
  const [shorts,      setShorts]      = useState([])    // ตารางคลิปสั้นของเดือนนั้น

  // ── UI state ────────────────────────────────────────────────
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  // ── Current calendar month (for fetching) ──
  const [currentDate, setCurrentDate] = useState(new Date())

  // ── Availability cache (VTuber working days) ──
  const [availabilityCache, setAvailabilityCache] = useState({})

  // ── Filter states & Available days for team calendar ──
  const [selectedTalentId, setSelectedTalentId] = useState(null)
  const [filterMode, setFilterMode] = useState('all')
  const [availableDays, setAvailableDays] = useState([])

  // ── Initial load ──
  useEffect(() => {
    if (!user) return
    const init = async () => {
      try {
        setLoading(true)
        const [profile, talentList, teamMemberList] = await Promise.all([
          getMyProfile(user.id),
          getTalents(),
          getTeamMembers(),
        ])
        setMyProfile(profile)
        setTalents(talentList)
        setTeamMembers(teamMemberList)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [user])

  // ── Fetch data when month changes ──
  const fetchMonthData = useCallback(async () => {
    if (!user) return
    try {
      const monthStr = toMonthKey(currentDate)
      const [rawComms, rawStreams, rawClips] = await Promise.all([
        getCommissions(user.id),
        getStreams({ month: monthStr }),
        getClips({ month: monthStr }),
      ])
      setTeamTasks(rawComms.map(mapCommission))
      setStreams(rawStreams.map(mapStream))
      setShorts(rawClips.map(mapClip))
    } catch (e) {
      setError(e.message)
    }
  }, [user, currentDate])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMonthData()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchMonthData])

  // ── Effect: จัดการ cache และดึงวันทำงาน VTuber ──
  useEffect(() => {
    // 1. ล้างฟิลเตอร์ออก หรือไม่ใช่โหมด specific-vtuber -> ล้างวันว่างทันที
    if (filterMode !== 'specific-vtuber' || !selectedTalentId) {
      setAvailableDays([])
      return
    }

    const fetchAvailability = async () => {
      // ค้นหา user_id (UUID) จาก talents
      const targetTalent = talents.find(t => t.id === Number(selectedTalentId))
      const vtuberUserId = targetTalent?.user_id

      if (!vtuberUserId) {
        setAvailableDays([])
        return
      }

      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      const cacheKey = `${vtuberUserId}:${year}-${String(month).padStart(2, '0')}`

      // ตรวจสอบใน Cache ก่อน
      if (availabilityCache[cacheKey] !== undefined) {
        setAvailableDays(availabilityCache[cacheKey])
        return
      }

      try {
        const days = await getVTuberAvailability(vtuberUserId, year, month)
        const sortedDays = (days || []).sort((a, b) => a - b)
        
        // บันทึกลง state และ cache
        setAvailableDays(sortedDays)
        setAvailabilityCache(prev => ({
          ...prev,
          [cacheKey]: sortedDays
        }))
      } catch (e) {
        console.error('Failed to fetch availability in TeamDashboard:', e)
        setAvailableDays([])
      }
    }

    fetchAvailability()
  }, [filterMode, selectedTalentId, currentDate, talents, availabilityCache, setAvailabilityCache])

  // ── Toggle handlers (optimistic update + DB sync) ──
  const handleToggleStreamThumbnail = async (id) => {
    const target = streams.find(s => s.id === id)
    if (!target) return
    setStreams(prev => prev.map(s => s.id === id ? { ...s, thumbnailDone: !s.thumbnailDone } : s))
    try {
      await dbToggleStreamThumb(id, target.thumbnailDone)
    } catch {
      setStreams(prev => prev.map(s => s.id === id ? { ...s, thumbnailDone: target.thumbnailDone } : s))
    }
  }

  const handleToggleClipThumbnail = async (id) => {
    const target = shorts.find(s => s.id === id)
    if (!target) return
    setShorts(prev => prev.map(s => s.id === id ? { ...s, thumbnailDone: !s.thumbnailDone } : s))
    try {
      await dbToggleClipThumb(id, target.thumbnailDone)
    } catch {
      setShorts(prev => prev.map(s => s.id === id ? { ...s, thumbnailDone: target.thumbnailDone } : s))
    }
  }

  const handleToggleScript = async (id) => {
    const target = shorts.find(s => s.id === id)
    if (!target) return
    setShorts(prev => prev.map(s => s.id === id ? { ...s, scriptDone: !s.scriptDone } : s))
    try {
      await dbToggleClipScript(id, target.scriptDone)
    } catch {
      setShorts(prev => prev.map(s => s.id === id ? { ...s, scriptDone: target.scriptDone } : s))
    }
  }

  const handleAdvanceTeamTask = async (id) => {
    const task = teamTasks.find(t => t.id === id)
    if (!task) return
    const nextStatus = task.status === 'pending' ? 'in_progress' : 'done'
    setTeamTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t))
    try {
      await updateCommissionStatus(id, nextStatus)
    } catch {
      setTeamTasks(prev => prev.map(t => t.id === id ? { ...t, status: task.status } : t))
    }
  }

  const handleCreateCalendarEvent = async (type, payload, selectedDate) => {
    if (!user) return
    if (type === 'commission') {
      await createCommission({
        title: payload.title,
        ownerId: user.id,
        talentId: payload.talentId ? Number(payload.talentId) : null,
        priority: 'Medium',
        startDate: payload.startDate,
        endDate: payload.endDate,
        totalRevenue: payload.revenue,
        description: payload.description,
        partners: payload.partners.map(partner => ({ userId: partner.userId, amount: partner.amount })),
      })
    } else if (type === 'stream') {
      await createStream({
        talentId: Number(payload.talentId),
        createdBy: user.id,
        title: payload.title,
        streamDate: selectedDate,
        startTime: payload.startTime,
        platform: payload.platform,
        needsThumbnail: payload.needsThumbnail,
      })
    } else if (type === 'clip') {
      await createClip({
        talentId: Number(payload.talentId),
        createdBy: user.id,
        ideaTitle: payload.title,
        publishDate: selectedDate,
        format: payload.format,
        needsScript: payload.needsScript,
        needsThumbnail: payload.needsThumbnail,
      })
    }
    await fetchMonthData()
  }

  const handleDeleteCalendarEvent = async (event) => {
    if (!window.confirm('ต้องการลบงานนี้หรือไม่?')) return
    try {
      if (event.type === 'commission') {
        await deleteCommission(event.id)
        setTeamTasks(prev => prev.filter(task => task.id !== event.id))
      }
      if (event.type === 'stream') {
        await deleteStream(event.id)
        setStreams(prev => prev.filter(stream => stream.id !== event.id))
      }
      if (event.type === 'clip') {
        await deleteClip(event.id)
        setShorts(prev => prev.filter(clip => clip.id !== event.id))
      }
    } catch (e) {
      alert('ลบไม่สำเร็จ: ' + e.message)
    }
  }

  const handleUpdateCalendarEvent = async (event, updates) => {
    if (event.type === 'commission') setTeamTasks(prev => prev.map(task => task.id === event.id ? { ...task, ...updates } : task))
    if (event.type === 'stream') setStreams(prev => prev.map(stream => stream.id === event.id ? { ...stream, ...updates } : stream))
    if (event.type === 'clip') setShorts(prev => prev.map(clip => clip.id === event.id ? { ...clip, ...updates } : clip))

    try {
      if (event.type === 'commission' && updates.status) await updateCommissionStatus(event.id, updates.status)
      if (event.type === 'stream' && updates.status === 'done') await endStream(event.id, { endTime: updates.endTime, revenue: updates.revenue })
      if (event.type === 'stream' && updates.thumbnailDone !== undefined) await dbToggleStreamThumb(event.id, event.thumbnailDone)
      if (event.type === 'clip' && updates.status) await updateClipStatus(event.id, updates.status)
      if (event.type === 'clip' && updates.scriptDone !== undefined) await dbToggleClipScript(event.id, event.scriptDone)
      if (event.type === 'clip' && updates.thumbnailDone !== undefined) await dbToggleClipThumb(event.id, event.thumbnailDone)
    } catch (e) {
      alert('อัปเดตไม่สำเร็จ: ' + e.message)
      fetchMonthData()
    }
  }

  const handleEndCalendarStream = async (event, updates) => {
    await handleUpdateCalendarEvent(event, {
      status: 'done',
      endTime: updates.endTime,
      revenue: updates.revenue,
    })
  }

  // ── Tab Config ──────────────────────────────────────────────
  const TABS = [
    { id: 'calendar', label: 'Master Calendar',  icon: Calendar     },
    { id: 'vtuber',   label: 'To Do List',        icon: CheckCircle2 },
    { id: 'team',     label: 'Pipeline & Goals',  icon: Layers       },
  ]

  if (loading) return (
    <div className="min-h-screen bg-[#07070a] flex items-center justify-center">
      <Spinner text="กำลังโหลดข้อมูล..." />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#07070a] flex items-center justify-center">
      <p className="text-red-400 text-sm">เกิดข้อผิดพลาด: {error}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-200 antialiased font-sans">
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-10 space-y-4">

        {/* ── Tab Bar ── */}
        <nav className="flex bg-[#0f0f17] border border-white/[0.05] rounded-xl p-1 gap-1 shadow-md">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold flex-1 justify-center transition-all duration-150
                  ${active ? 'bg-indigo-600/90 text-white shadow-sm shadow-indigo-900/40' : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]'}`}>
                <Icon size={13} className="shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </nav>

        {/* ── Content Router ── */}
        <div className="animate-in fade-in duration-200">
          {activeTab === 'calendar' && (
            <MasterCalendar
              role="team"
              userId={user.id}
              myProfile={myProfile}
              talents={talents}
              teamMembers={teamMembers}
              commissions={teamTasks}
              streams={streams}
              clips={shorts}
              currentDate={currentDate}
              onMonthChange={setCurrentDate}
              permissions={{
                canCreate: true,
                canEditStatus: true,
                canDelete: true,
                canEndStream: true,
                canViewFinancials: true,
                canFilterAllTalents: true,
              }}
              allowedTypes={['commission', 'stream', 'clip']}
              onCreateEvent={handleCreateCalendarEvent}
              onUpdateEvent={handleUpdateCalendarEvent}
              onDeleteEvent={handleDeleteCalendarEvent}
              onEndStream={handleEndCalendarStream}
              filterMode={filterMode}
              onFilterModeChange={setFilterMode}
              selectedTalentId={selectedTalentId}
              onSelectedTalentChange={setSelectedTalentId}
              availableDays={availableDays}
            />
          )}
          {activeTab === 'vtuber' && (
            <VTuberChecklistTab
              userId={user.id}
              teamTasks={teamTasks}
              streams={streams}
              shorts={shorts}
              myProfile={myProfile}
              toggleStreamThumbnail={handleToggleStreamThumbnail}
              toggleClipThumbnail={handleToggleClipThumbnail}
              toggleScript={handleToggleScript}
              advanceTeamTask={handleAdvanceTeamTask}
              onDeleteEvent={handleDeleteCalendarEvent}
            />
          )}
          {activeTab === 'team' && (
            <TeamPipelineTab
              teamTasks={teamTasks}
              streams={streams}
              advanceTeamTask={handleAdvanceTeamTask}
            />
          )}
        </div>

      </div>
    </div>
  )
}
