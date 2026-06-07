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
  Layers, Calendar, CheckCircle2, Loader2, RefreshCw,
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

import Spinner from '../components/common/Spinner'
import VTuberChecklistTab from '../components/team/VTuberChecklistTab'
import TeamPipelineTab from '../components/team/TeamPipelineTab'

/**
 * แสดงหน้า Team Dashboard หลัก พร้อม Master Calendar, VTuber Checklist และ Team Pipeline
 *
 * @param {void} ไม่มี parameter
 * @returns {React.ReactElement} หน้า Dashboard สำหรับทีม Staff
 */
export default function TeamDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('calendar')
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['calendar']))

  const [refreshKey, setRefreshKey] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

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

  // โหลดข้อมูลพื้นฐานที่ใช้ร่วมกันในทุกแท็บของ Team Dashboard
  useEffect(() => {
    if (!user?.id) return
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
  }, [user?.id, refreshKey])

  /**
   * โหลดข้อมูล commission, stream และ clip ของเดือนปัจจุบันจาก Supabase service layer
   *
   * @param {void} ไม่มี parameter
   * @returns {Promise<void>} Promise ที่ resolve เมื่อโหลดและ map ข้อมูลเสร็จ
   */
  const fetchMonthData = useCallback(async () => {
    if (!user?.id) return
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
  }, [user?.id, currentDate, refreshKey])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMonthData()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchMonthData])

  // โหลดวันว่างของ VTuber ที่เลือก โดยอ่านจาก cache ก่อนเรียก API
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

  /**
   * สลับสถานะ thumbnail ของ stream แบบ optimistic update แล้ว sync กับฐานข้อมูล
   *
   * @param {number} id - id ของ stream ที่ต้องการสลับสถานะ
   * @returns {Promise<void>} Promise ที่ resolve เมื่อ sync เสร็จหรือ rollback แล้ว
   */
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

  /**
   * สลับสถานะ thumbnail ของ clip แบบ optimistic update แล้ว sync กับฐานข้อมูล
   *
   * @param {number} id - id ของ clip ที่ต้องการสลับสถานะ
   * @returns {Promise<void>} Promise ที่ resolve เมื่อ sync เสร็จหรือ rollback แล้ว
   */
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

  /**
   * สลับสถานะ script ของ clip แบบ optimistic update แล้ว sync กับฐานข้อมูล
   *
   * @param {number} id - id ของ clip ที่ต้องการสลับสถานะ script
   * @returns {Promise<void>} Promise ที่ resolve เมื่อ sync เสร็จหรือ rollback แล้ว
   */
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

  /**
   * เลื่อนสถานะ commission ไปขั้นถัดไปและ sync กับฐานข้อมูล
   *
   * @param {number} id - id ของ commission ที่ต้องการเลื่อนสถานะ
   * @returns {Promise<void>} Promise ที่ resolve เมื่อ sync เสร็จหรือ rollback แล้ว
   */
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

  /**
   * สร้าง Event จาก MasterCalendar ตามประเภทที่เลือกแล้ว reload ข้อมูลเดือน
   *
   * @param {'commission'|'stream'|'clip'} type - ประเภท Event ที่ต้องการสร้าง
   * @param {Object} payload - ข้อมูลจากฟอร์มสร้าง Event
   * @param {string} selectedDate - วันที่ที่เลือกในปฏิทิน รูปแบบ YYYY-MM-DD
   * @returns {Promise<void>} Promise ที่ resolve หลังสร้าง Event และโหลดข้อมูลใหม่
   */
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

  /**
   * ลบ Event จาก MasterCalendar หลังผู้ใช้ยืนยัน และอัปเดต state ฝั่ง client
   *
   * @param {Object} event - Event ที่ต้องการลบ พร้อม id และ type
   * @returns {Promise<void>} Promise ที่ resolve เมื่อลบเสร็จหรือแจ้ง error แล้ว
   */
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

  /**
   * อัปเดต Event แบบ optimistic update แล้ว sync กับฐานข้อมูลตามชนิด Event
   *
   * @param {Object} event - Event เดิมที่ต้องการอัปเดต
   * @param {Object} updates - ข้อมูลที่ต้องการเปลี่ยนแปลง
   * @returns {Promise<void>} Promise ที่ resolve เมื่อ sync เสร็จ หรือ reload เมื่อเกิด error
   */
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

  /**
   * แปลงข้อมูลการจบไลฟ์จาก EndStreamModal เป็น update payload ให้ handler กลาง
   *
   * @param {Object} event - Stream Event ที่ต้องการจบไลฟ์
   * @param {Object} updates - ข้อมูลเวลาจบและรายได้
   * @returns {Promise<void>} Promise ที่ resolve เมื่ออัปเดต stream เสร็จ
   */
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

        {/* ── Header ── */}
        <div className="flex items-center justify-between bg-[#0d0d16] border border-white/[0.05] rounded-2xl px-5 py-3.5 shadow-md shadow-indigo-950/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center">
              <Layers size={16} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Team Dashboard</p>
              <p className="text-sm font-bold text-white leading-tight">
                {myProfile?.display_name ?? 'Staff'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* ── Refresh Button ── */}
            <button
              onClick={() => {
                setIsRefreshing(true)
                setRefreshKey(k => k + 1)
                setTimeout(() => setIsRefreshing(false), 800)
              }}
              disabled={isRefreshing}
              title="รีเฟรชข้อมูลทั้งหมด"
              className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg
                bg-white/[0.03] hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-300
                border border-white/[0.06] hover:border-indigo-500/20 transition-all
                disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <RefreshCw size={11} className={isRefreshing ? 'animate-spin text-indigo-400' : ''} />
              <span className="hidden sm:inline">
                {isRefreshing ? 'กำลังรีเฟรช...' : 'Refresh'}
              </span>
            </button>
          </div>
        </div>

        {/* ── Tab Switcher ── */}
        <div className="flex bg-[#0d0d16] border border-white/[0.05] rounded-xl p-1 shadow-md gap-0.5">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setVisitedTabs(prev => new Set(prev).add(tab.id))
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex-1 justify-center
                  ${active 
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-900/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'}`}
              >
                <Icon size={14} className="shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* ── Content Router ── */}
        <div className="animate-in fade-in duration-200">
          <div className={activeTab === 'calendar' ? 'block' : 'hidden'}>
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
          </div>
          
          {visitedTabs.has('vtuber') && (
            <div className={activeTab === 'vtuber' ? 'block' : 'hidden'}>
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
            </div>
          )}
          
          {visitedTabs.has('team') && (
            <div className={activeTab === 'team' ? 'block' : 'hidden'}>
              <TeamPipelineTab
              teamTasks={teamTasks}
              streams={streams}
              advanceTeamTask={handleAdvanceTeamTask}
            />
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
