// src/pages/TeamDashboard.jsx
// ─────────────────────────────────────────────────────────────
// หน้า Dashboard หลักของทีม Staff
// ประกอบด้วย 3 Tab:
//   1. Master Calendar  — ตารางงานรายเดือน พร้อมเพิ่ม/แก้ไขงาน
//   2. VTuber Checklist — ติดตาม thumbnails และ scripts
//   3. Team Pipeline    — Kanban + สรุปรายได้รายเดือน
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Layers, Calendar, ChevronLeft, ChevronRight,
  Video, Film, CheckCircle2, AlertCircle, Plus,
  BarChart3, Wallet, Clock,
  ChevronRight as ChevronRightIcon,
  X, Trash2, CheckCircle, Loader2
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  getCommissions, createCommission, updateCommissionStatus, deleteCommission,
  getStreams, createStream, toggleStreamThumbnail as dbToggleStreamThumb, endStream, deleteStream,
  getClips, createClip, toggleClipScript as dbToggleClipScript, toggleClipThumbnail as dbToggleClipThumb,
  updateClipStatus, deleteClip,
  getTalents, getMyProfile, getTeamMembers,
  mapCommission, mapStream, mapClip,
} from '../lib/supabaseservice'

// ══════════════════════════════════════════════════════════════
// 🎨 UI Components (Shared)
// ══════════════════════════════════════════════════════════════

/** คืน Tailwind class string สำหรับ badge priority ของ commission */
function getPriorityBadge(priority) {
  switch (priority) {
    case 'Urgent': return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'High':   return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'Medium': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    default:       return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }
}

/** Wrapper card มี dark bg + border สำหรับ layout ทั่วทั้งหน้า */
function Card({ children, className = '' }) {
  return (
    <div className={`bg-[#0f0f17] border border-white/[0.05] rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  )
}

/** Loading indicator ตรงกลางหน้า */
function Spinner({ text = 'กำลังโหลด...' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
      <Loader2 size={16} className="animate-spin" />
      <span className="text-xs">{text}</span>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 🔧 Pure Helper Functions
// ══════════════════════════════════════════════════════════════

/** แปลง (year, month) → 'YYYY-MM' string สำหรับส่งไป API */
function toMonthStr(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

/** คืนเวลาปัจจุบันแบบ 'HH:MM' (24 ชั่วโมง) สำหรับ default end time */
function getCurrentTime24() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/**
 * คำนวณตัวเลขการเงินของ commission
 * @param {{ revenue?: number, totalRevenue?: number, partners?: Array<{amount: number}> }} taskOrDraft
 * @returns {{ gross, companyShare, teamPool, ownerShare, partnersTotal }}
 */
function getCommissionFinancials(taskOrDraft) {
  const gross = Number(taskOrDraft.revenue ?? taskOrDraft.totalRevenue ?? 0) || 0
  const partners = taskOrDraft.partners ?? []
  const companyShare  = gross * 0.1                                              // บริษัทได้ 10%
  const teamPool      = gross * 0.9                                              // ทีมได้ 90%
  const partnersTotal = partners.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const ownerShare    = Math.max(0, teamPool - partnersTotal)                   // เจ้าของงานได้ส่วนที่เหลือ

  return { gross, companyShare, teamPool, ownerShare, partnersTotal }
}

/**
 * คำนวณตัวเลขการเงินของ stream
 * @param {{ revenue: number }} stream
 * @returns {{ gross, companyShare, talentShare }}
 */
function getStreamFinancials(stream) {
  const gross = Number(stream.revenue) || 0
  return {
    gross,
    companyShare: gross * 0.6,   // บริษัทได้ 60%
    talentShare:  gross * 0.4,   // VTuber ได้ 40%
  }
}

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
  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()

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
      const monthStr = toMonthStr(year, month)
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
  }, [user, year, month])

  useEffect(() => {
    fetchMonthData()
  }, [fetchMonthData])

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

  // ── Tab Config ──────────────────────────────────────────────
  // เพิ่ม Tab ใหม่ที่นี่ แล้วเพิ่ม renderer ใน JSX ด้านล่าง
  const TABS = [
    { id: 'calendar', label: 'Master Calendar',  icon: Calendar     },
    { id: 'vtuber',   label: 'เคสงาน',          icon: CheckCircle2 },
    { id: 'team',     label: 'Pipeline & Goals', icon: Layers       },
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
            <MasterCalendarTab
              user={user}
              myProfile={myProfile}
              talents={talents}
              teamMembers={teamMembers}
              teamTasks={teamTasks} streams={streams} shorts={shorts}
              setTeamTasks={setTeamTasks} setStreams={setStreams} setShorts={setShorts}
              currentDate={currentDate} setCurrentDate={setCurrentDate}
              refetch={fetchMonthData}
            />
          )}
          {activeTab === 'vtuber' && (
            <VTuberChecklistTab
              teamTasks={teamTasks} streams={streams} shorts={shorts}
              myProfile={myProfile}
              toggleStreamThumbnail={handleToggleStreamThumbnail}
              toggleClipThumbnail={handleToggleClipThumbnail}
              toggleScript={handleToggleScript}
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

// ══════════════════════════════════════════════════════════════
// 🟦 Tab 1 — Master Calendar
// ปฏิทินรายเดือน: กรองงาน 3 โหมด, กดวันเพื่อดู/เพิ่มงาน
// ══════════════════════════════════════════════════════════════
function MasterCalendarTab({
  user, myProfile, talents, teamMembers,
  teamTasks, streams, shorts,
  setTeamTasks, setStreams, setShorts,
  currentDate, setCurrentDate,
  refetch,
}) {
  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // ── UI State ─────────────────────────────────────────────────
  const [filterMode,             setFilterMode]             = useState('my-schedule')  // 'my-schedule' | 'all-vtubers' | 'specific-vtuber'
  const [selectedFilterTalentId, setSelectedFilterTalentId] = useState(null)           // id ของ VTuber ที่เลือก (โหมด specific)
  const [selectedDate,           setSelectedDate]           = useState(null)           // วันที่กดในปฏิทิน 'YYYY-MM-DD'
  const [isDetailModalOpen,      setIsDetailModalOpen]      = useState(false)          // modal แสดงรายการงานของวันนั้น
  const [isAddModalOpen,         setIsAddModalOpen]         = useState(false)          // modal เพิ่มงานใหม่
  const [taskType,               setTaskType]               = useState('commission')   // ประเภทงานที่กำลังเพิ่ม: 'commission' | 'stream' | 'clip'
  const [saving,                 setSaving]                 = useState(false)          // กำลัง submit form

  // ── End Stream Modal State ───────────────────────────────────
  const [endingStream,  setEndingStream]  = useState(null)   // stream object ที่กำลังจะสรุปจบ
  const [streamEndTime, setStreamEndTime] = useState('')     // เวลาจบ 'HH:MM'
  const [streamRevenue, setStreamRevenue] = useState(0)     // รายได้จากสตรีมนั้น (บาท)

  // ── Commission Form State ────────────────────────────────────
  const [commName,         setCommName]         = useState('')
  const [commRevenue,      setCommRevenue]      = useState(0)
  const [commStartDate,    setCommStartDate]    = useState('')
  const [commEndDate,      setCommEndDate]      = useState('')
  const [commDesc,         setCommDesc]         = useState('')
  const [commTalentId,     setCommTalentId]     = useState('')
  const [selectedPartners, setSelectedPartners] = useState([])  // [{ userId, name, amount }]
  const [partnerSelect,    setPartnerSelect]    = useState('')  // value ของ dropdown เลือก partner

  // ── Stream Form State ────────────────────────────────────────
  const [streamTitle,     setStreamTitle]     = useState('')
  const [streamTalentId,  setStreamTalentId]  = useState('')
  const [streamStartTime, setStreamStartTime] = useState('20:00')
  const [streamNeedThumb, setStreamNeedThumb] = useState(true)
  const [streamPlatform,  setStreamPlatform]  = useState('YouTube')

  // ── Clip Form State ──────────────────────────────────────────
  const [clipTitle,      setClipTitle]      = useState('')
  const [clipTalentId,   setClipTalentId]   = useState('')
  const [clipFormat,     setClipFormat]     = useState('Short')  // 'Short' | 'Long'
  const [clipNeedScript, setClipNeedScript] = useState(true)
  const [clipNeedThumb,  setClipNeedThumb]  = useState(true)

  // Calendar math
  const THAI_MONTHS   = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
  const totalDays     = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month])
  const firstDayIndex = useMemo(() => new Date(year, month, 1).getDay(), [year, month])
  const calendarDays  = useMemo(() => [...Array(firstDayIndex).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)], [firstDayIndex, totalDays])

  const draftCommissionFinancials = getCommissionFinancials({ revenue: commRevenue, partners: selectedPartners })
  const myAmount = draftCommissionFinancials.ownerShare

  // ── Dropdown: ชื่อ VTuber สำหรับ filter ──
  const selectedTalentName = talents.find(t => t.id === selectedFilterTalentId)?.talent_name ?? ''

  // ── Set default talent เมื่อโหลด talents ──
  useEffect(() => {
    if (talents.length > 0 && !selectedFilterTalentId) {
      setSelectedFilterTalentId(talents[0].id)
      setStreamTalentId(String(talents[0].id))
      setClipTalentId(String(talents[0].id))
    }
  }, [talents])

  // ── Filter Logic ─────────────────────────────────────────────
  /**
   * กรองข้อมูลตามโหมดที่เลือก ก่อนแสดงในปฏิทิน/modal
   *
   * โหมด 'my-schedule':     commission ที่ user เป็น owner/partner + stream/clip ที่ user เป็น createdBy
   * โหมด 'all-vtubers':     stream + clip ทุกคน (ไม่รวม commission)
   * โหมด 'specific-vtuber': stream + clip เฉพาะ VTuber ที่เลือกจาก dropdown
   */
  const applyFilter = (comms, strms, clps) => {
    if (filterMode === 'my-schedule') {
      return {
        comms,
        strms: strms.filter(s => s.createdBy === user.id),
        clps:  clps.filter(c => c.createdBy === user.id),
      }
    }
    if (filterMode === 'all-vtubers') {
      return { comms: [], strms, clps }
    }
    if (filterMode === 'specific-vtuber') {
      return {
        comms: [],
        strms: strms.filter(s => s.talentId === selectedFilterTalentId),
        clps:  clps.filter(c => c.talentId === selectedFilterTalentId),
      }
    }
    return { comms, strms, clps }
  }

  // ── Event Handlers ───────────────────────────────────────────
  /** กดวันในปฏิทิน → เปิด detail modal */
  const handleDayClick = (dateStr) => { setSelectedDate(dateStr); setIsDetailModalOpen(true) }

  const handleOpenAddForm = () => {
    setIsDetailModalOpen(false)
    setCommStartDate(selectedDate); setCommEndDate(selectedDate)
    setCommName(''); setCommRevenue(0); setCommDesc(''); setCommTalentId('')
    setSelectedPartners([])
    setStreamTitle('')
    setClipTitle('')
    setIsAddModalOpen(true)
  }

  const handleDeleteTask = async (type, id) => {
    if (!window.confirm('ต้องการลบงานนี้หรือไม่?')) return
    try {
      if (type === 'commission') { await deleteCommission(id);  setTeamTasks(prev => prev.filter(t => t.id !== id)) }
      if (type === 'stream')     { await deleteStream(id);      setStreams(prev => prev.filter(s => s.id !== id)) }
      if (type === 'clip')       { await deleteClip(id);        setShorts(prev => prev.filter(c => c.id !== id)) }
    } catch (e) {
      alert('ลบไม่สำเร็จ: ' + e.message)
    }
  }

  const handleToggleStatus = async (type, id, updates) => {
    // Optimistic
    if (type === 'commission') setTeamTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    if (type === 'stream')     setStreams(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    if (type === 'clip')       setShorts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    // DB sync
    try {
      if (type === 'commission' && updates.status) await updateCommissionStatus(id, updates.status)
      if (type === 'stream' && updates.status === 'done') await endStream(id, { endTime: updates.endTime, revenue: updates.revenue })
      if (type === 'stream' && updates.thumbnailDone !== undefined) await dbToggleStreamThumb(id, !updates.thumbnailDone)
      if (type === 'clip' && updates.status) await updateClipStatus(id, updates.status)
      if (type === 'clip' && updates.scriptDone !== undefined) await dbToggleClipScript(id, !updates.scriptDone)
      if (type === 'clip' && updates.thumbnailDone !== undefined) await dbToggleClipThumb(id, !updates.thumbnailDone)
    } catch (e) {
      alert('อัปเดตไม่สำเร็จ: ' + e.message)
      refetch()
    }
  }

  const handleOpenEndStreamModal = (stream) => {
    setEndingStream(stream)
    setStreamEndTime(stream.endTime || getCurrentTime24())
    setStreamRevenue(stream.revenue || 0)
  }

  const handleCloseEndStreamModal = () => {
    setEndingStream(null)
    setStreamEndTime('')
    setStreamRevenue(0)
  }

  const handleSaveEndStream = async (e) => {
    e.preventDefault()
    if (!endingStream) return
    await handleToggleStatus('stream', endingStream.id, {
      status: 'done',
      endTime: streamEndTime,
      revenue: Math.max(0, Number(streamRevenue) || 0),
    })
    handleCloseEndStreamModal()
  }

  const handleSaveTask = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (taskType === 'commission') {
        await createCommission({
          title:        commName,
          ownerId:      user.id,
          talentId:     commTalentId ? Number(commTalentId) : null,
          priority:     'Medium',
          startDate:    commStartDate,
          endDate:      commEndDate,
          totalRevenue: commRevenue,
          description:  commDesc,
          partners:     selectedPartners.map(p => ({ userId: p.userId, amount: p.amount })),
        })
        await refetch()
      } else if (taskType === 'stream') {
        await createStream({
          talentId:       Number(streamTalentId),
          createdBy:      user.id,
          title:          streamTitle,
          streamDate:     selectedDate,
          startTime:      streamStartTime,
          platform:       streamPlatform,
          needsThumbnail: streamNeedThumb,
        })
        await refetch()
      } else if (taskType === 'clip') {
        await createClip({
          talentId:       Number(clipTalentId),
          createdBy:      user.id,
          ideaTitle:      clipTitle,
          publishDate:    selectedDate,
          format:         clipFormat,
          needsScript:    clipNeedScript,
          needsThumbnail: clipNeedThumb,
        })
        await refetch()
      }
      setIsAddModalOpen(false)
    } catch (err) {
      alert('บันทึกไม่สำเร็จ: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddPartner = () => {
    if (!partnerSelect) return
    const [userId, name] = partnerSelect.split('|')
    if (selectedPartners.find(p => p.userId === userId)) return
    setSelectedPartners([...selectedPartners, { userId, name, amount: 0 }])
    setPartnerSelect('')
  }

  const handleRemovePartner = (userId) => {
    setSelectedPartners(prev => prev.filter(p => p.userId !== userId))
  }

  const handlePartnerAmountChange = (index, newAmount) => {
    let val = Math.max(0, Number(newAmount))
    const otherTotal = selectedPartners.reduce((sum, p, i) => i !== index ? sum + p.amount : sum, 0)
    if (val + otherTotal > draftCommissionFinancials.teamPool) val = draftCommissionFinancials.teamPool - otherTotal
    const updated = [...selectedPartners]
    updated[index].amount = val
    setSelectedPartners(updated)
  }

  // ── Today check ──
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <Card className="overflow-hidden">
      {/* ── Header Row 1 ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Calendar size={14} className="text-indigo-400" /> Master Calendar
        </span>
        <div className="flex items-center gap-1.5 bg-[#161622] px-2.5 py-1 rounded-lg border border-white/[0.06]">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-0.5 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-bold text-slate-200 min-w-[108px] text-center select-none">
            {THAI_MONTHS[month]} {year}
          </span>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-0.5 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Header Row 2: Filter ── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-[#0d0d14]">
        <div className="flex items-center gap-1 bg-[#161622] p-1 rounded-lg border border-white/[0.06]">
          {[
            { mode: 'my-schedule',     label: '💻 ตารางตัวเอง', active: 'bg-indigo-600 text-white' },
            { mode: 'all-vtubers',     label: '🎬 VTuber (รวม)', active: 'bg-purple-600 text-white' },
            { mode: 'specific-vtuber', label: '🔍 เลือกเจาะจง',  active: 'bg-pink-600 text-white'   },
          ].map(({ mode, label, active }) => (
            <button key={mode} onClick={() => setFilterMode(mode)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-all
                ${filterMode === mode ? active : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
              {label}
            </button>
          ))}
        </div>

        {filterMode === 'specific-vtuber' && (
          <select
            value={selectedFilterTalentId ?? ''}
            onChange={e => setSelectedFilterTalentId(Number(e.target.value))}
            className="bg-[#161622] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-pink-500 h-[30px] min-w-[140px]"
          >
            {talents.map(t => <option key={t.id} value={t.id}>{t.talent_name}</option>)}
          </select>
        )}
      </div>

      {/* ── Calendar Grid ── */}
      <div className="p-3">
        <div className="grid grid-cols-7 mb-1">
          {['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-500 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[3px]">
          {calendarDays.map((day, idx) => {
            if (!day) return <div key={`blank-${idx}`} />
            const dateStr  = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday  = dateStr === todayStr
            const rawComms = teamTasks.filter(t => t.startDate <= dateStr && t.endDate >= dateStr)
            const rawStrms = streams.filter(s => s.date === dateStr)
            const rawClps  = shorts.filter(c => c.date === dateStr)
            const { comms: dComms, strms: dStrms, clps: dClps } = applyFilter(rawComms, rawStrms, rawClps)
            const allItems = [
              ...dComms.map(t => ({ key: t.id, label: `💻 ${t.title}`, cls: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/15' })),
              ...dStrms.map(s => ({ key: s.id, label: `🎥 ${s.title}`, cls: 'bg-purple-600/20 text-purple-300 border-purple-500/15' })),
              ...dClps.map(c  => ({ key: c.id, label: `🎬 ${c.idea}`,  cls: 'bg-pink-600/20 text-pink-300 border-pink-500/15'     })),
            ]
            const overflow = allItems.length > 2 ? allItems.length - 2 : 0
            return (
              <div key={dateStr} onClick={() => handleDayClick(dateStr)}
                className={`min-h-[68px] p-1.5 rounded-lg border flex flex-col gap-[3px] cursor-pointer transition-all hover:brightness-125
                  ${isToday ? 'bg-indigo-900/25 border-indigo-500/40' : 'bg-[#13131e] border-white/[0.05] hover:border-white/10'}`}>
                <span className={`text-[11px] font-bold leading-none ${isToday ? 'text-indigo-400' : 'text-slate-400'}`}>{day}</span>
                <div className="flex-1 space-y-[2px] overflow-hidden">
                  {allItems.slice(0, 2).map(item => (
                    <div key={item.key} className={`text-[9px] px-1 py-[1px] rounded border truncate leading-tight ${item.cls}`}>{item.label}</div>
                  ))}
                  {overflow > 0 && <div className="text-[9px] text-slate-500 font-bold px-1">+{overflow} more</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-[#15151f] border border-slate-700/60 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/60 flex justify-between items-center bg-[#1a1a28]">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Clock size={15} className="text-indigo-400" /> งานวันที่ {selectedDate}
              </h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-colors"><X size={18} /></button>
            </div>

            <div className="p-5 max-h-[58vh] overflow-y-auto space-y-3 bg-[#15151f]">
              {(() => {
                const rawComms = teamTasks.filter(t => t.startDate <= selectedDate && t.endDate >= selectedDate)
                const rawStrms = streams.filter(s => s.date === selectedDate)
                const rawClps  = shorts.filter(c => c.date === selectedDate)
                const { comms: dayComms, strms: dayStrms, clps: dayClps } = applyFilter(rawComms, rawStrms, rawClps)
                if (!dayComms.length && !dayStrms.length && !dayClps.length)
                  return <p className="text-sm text-slate-500 text-center py-8">ไม่มีคิวงานในวันนี้</p>
                return (
                  <>
                    {dayComms.map(t => (
                      <div key={t.id} className={`p-3.5 rounded-xl border text-sm ${t.status === 'done' ? 'bg-emerald-900/15 border-emerald-500/20 opacity-70' : 'bg-indigo-900/15 border-indigo-500/25'}`}>
                        {(() => {
                          const financials = getCommissionFinancials(t)
                          return (
                            <>
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-bold uppercase">Commission</span>
                          <div className="flex gap-1.5">
                            {t.status !== 'done' && (
                              <button onClick={() => handleToggleStatus('commission', t.id, { status: 'done' })} className="text-[10px] flex items-center gap-1 text-emerald-400 hover:bg-emerald-500/20 px-2 py-0.5 rounded transition-colors">
                                <CheckCircle size={12} /> เสร็จสิ้น
                              </button>
                            )}
                            <button onClick={() => handleDeleteTask('commission', t.id)} className="text-red-400 hover:bg-red-500/20 p-1 rounded transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        <h4 className={`font-bold text-white ${t.status === 'done' ? 'line-through text-slate-400' : ''}`}>{t.title}</h4>
                        <p className="text-slate-300 mt-1 text-xs">รายได้รวม: <span className="text-emerald-400 font-bold">{financials.gross.toLocaleString()}</span> บาท</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-[#1e1e2e] p-2 rounded-lg border border-slate-700">
                            <p className="text-slate-500 text-[10px]">บริษัท 10%</p>
                            <p className="text-violet-300 font-bold">{financials.companyShare.toLocaleString()} บ.</p>
                          </div>
                          <div className="bg-[#1e1e2e] p-2 rounded-lg border border-slate-700">
                            <p className="text-slate-500 text-[10px]">ทีม 90%</p>
                            <p className="text-indigo-300 font-bold">{financials.teamPool.toLocaleString()} บ.</p>
                          </div>
                        </div>
                        {t.partners?.length > 0 && (
                          <div className="mt-2 bg-[#1e1e2e] p-2.5 rounded-lg border border-slate-700 text-xs">
                            <p className="text-slate-400 mb-1 font-bold">สัดส่วนรายได้:</p>
                            <p className="text-white">{t.owner ?? myProfile?.display_name ?? 'ฉัน'}: {financials.ownerShare.toLocaleString()} บ. ({financials.teamPool > 0 ? Math.round((financials.ownerShare / financials.teamPool) * 100) : 0}% ของฝั่งทีม)</p>
                            {t.partners.map((p, i) => (
                              <p key={i} className="text-slate-300">- {p.name}: {p.amount.toLocaleString()} บ. ({financials.teamPool > 0 ? Math.round((p.amount / financials.teamPool) * 100) : 0}% ของฝั่งทีม)</p>
                            ))}
                          </div>
                        )}
                            </>
                          )
                        })()}
                      </div>
                    ))}

                    {dayStrms.map(s => (
                      <div key={s.id} className={`p-3.5 rounded-xl border text-sm ${s.status === 'done' ? 'bg-slate-800/40 border-slate-600 opacity-70' : 'bg-purple-900/15 border-purple-500/25'}`}>
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded font-bold uppercase">Live Stream</span>
                          <div className="flex gap-1.5">
                            {s.status !== 'done' && (
                              <button onClick={() => handleOpenEndStreamModal(s)} className="text-[10px] flex items-center gap-1 text-emerald-400 hover:bg-emerald-500/20 px-2 py-0.5 rounded transition-colors">
                                <CheckCircle size={12} /> จบไลฟ์
                              </button>
                            )}
                            <button onClick={() => handleDeleteTask('stream', s.id)} className="text-red-400 hover:bg-red-500/20 p-1 rounded transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        <h4 className="font-bold text-white">{s.title}</h4>
                        <p className="text-slate-300 mt-1 text-xs">วีทูปเบอร์: {s.talent} | เวลา: {s.time} น. {s.endTime && `(จบ: ${s.endTime})`}</p>
                        <div className="mt-2 flex items-center justify-between bg-[#1e1e2e] p-2 rounded-lg border border-slate-700 text-xs">
                          <span className="text-slate-300">{s.needsThumbnail ? (s.thumbnailDone ? '✅ ปก: เสร็จแล้ว' : '⚠️ ปก: รอดำเนินการ') : '✅ ปก: ไม่ต้องการ'}</span>
                          {s.needsThumbnail && !s.thumbnailDone && (
                            <button onClick={() => handleToggleStatus('stream', s.id, { thumbnailDone: true })} className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg transition-colors">ทำปกเสร็จ</button>
                          )}
                        </div>
                        {s.revenue > 0 && (() => {
                          const financials = getStreamFinancials(s)
                          return (
                            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                              <div className="bg-[#1e1e2e] p-2 rounded-lg border border-slate-700">
                                <p className="text-slate-500 text-[10px]">รายได้รวม</p>
                                <p className="text-emerald-400 font-bold">{financials.gross.toLocaleString()} บ.</p>
                              </div>
                              <div className="bg-[#1e1e2e] p-2 rounded-lg border border-slate-700">
                                <p className="text-slate-500 text-[10px]">บริษัท 60%</p>
                                <p className="text-violet-300 font-bold">{financials.companyShare.toLocaleString()} บ.</p>
                              </div>
                              <div className="bg-[#1e1e2e] p-2 rounded-lg border border-slate-700">
                                <p className="text-slate-500 text-[10px]">VTuber 40%</p>
                                <p className="text-emerald-300 font-bold">{financials.talentShare.toLocaleString()} บ.</p>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    ))}

                    {dayClps.map(c => (
                      <div key={c.id} className={`p-3.5 rounded-xl border text-sm ${c.status === 'done' ? 'bg-slate-800/40 border-slate-600 opacity-70' : 'bg-pink-900/15 border-pink-500/25'}`}>
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-[10px] bg-pink-600 text-white px-2 py-0.5 rounded font-bold uppercase">Video / Clip</span>
                          <div className="flex gap-1.5">
                            {c.status !== 'done' && (
                              <button onClick={() => handleToggleStatus('clip', c.id, { status: 'done' })} className="text-[10px] flex items-center gap-1 text-emerald-400 hover:bg-emerald-500/20 px-2 py-0.5 rounded transition-colors">
                                <CheckCircle size={12} /> เผยแพร่แล้ว
                              </button>
                            )}
                            <button onClick={() => handleDeleteTask('clip', c.id)} className="text-red-400 hover:bg-red-500/20 p-1 rounded transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        <h4 className="font-bold text-white">{c.idea}</h4>
                        <p className="text-slate-300 mt-1 text-xs">วีทูปเบอร์: {c.talent}</p>
                        <div className="flex flex-col gap-1.5 mt-2">
                          {c.needsScript && (
                            <div className="flex items-center justify-between bg-[#1e1e2e] p-2 rounded-lg border border-slate-700 text-xs">
                              <span className="text-slate-300">{c.scriptDone ? '✅ สคริปต์: เสร็จแล้ว' : '📝 สคริปต์: รอดำเนินการ'}</span>
                              {!c.scriptDone && <button onClick={() => handleToggleStatus('clip', c.id, { scriptDone: true })} className="bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded-lg transition-colors">ส่งสคริปต์แล้ว</button>}
                            </div>
                          )}
                          {c.needsThumbnail && (
                            <div className="flex items-center justify-between bg-[#1e1e2e] p-2 rounded-lg border border-slate-700 text-xs">
                              <span className="text-slate-300">{c.thumbnailDone ? '✅ ปกคลิป: เสร็จแล้ว' : '🖼️ ปกคลิป: รอดำเนินการ'}</span>
                              {!c.thumbnailDone && <button onClick={() => handleToggleStatus('clip', c.id, { thumbnailDone: true })} className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg transition-colors">ทำปกเสร็จ</button>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )
              })()}
            </div>

            <div className="px-5 py-3.5 bg-[#1a1a28] border-t border-slate-700/60 flex justify-end">
              <button onClick={handleOpenAddForm} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md">
                <Plus size={15} /> เพิ่มงานใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── End Stream Modal ── */}
      {endingStream && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="bg-[#15151f] border border-emerald-500/25 rounded-2xl w-full max-w-md shadow-2xl shadow-emerald-950/30 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-700/60 flex justify-between items-center bg-[#1a1a28]">
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <CheckCircle size={15} className="text-emerald-400" />
                  สรุปจบไลฟ์
                </h3>
                <p className="text-[11px] text-slate-500 truncate mt-1">{endingStream.title}</p>
              </div>
              <button type="button" onClick={handleCloseEndStreamModal} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEndStream} className="p-5 space-y-4 bg-[#15151f]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium mb-1.5 block">เวลาจบไลฟ์</label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$"
                    maxLength={5}
                    value={streamEndTime}
                    onChange={e => setStreamEndTime(e.target.value)}
                    className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="23:30"
                    title="กรอกเวลาแบบ 24 ชั่วโมง เช่น 23:30"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium mb-1.5 block">รายได้สตรีม (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={streamRevenue}
                    onChange={e => setStreamRevenue(e.target.value)}
                    className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={handleCloseEndStreamModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors">
                  ยกเลิก
                </button>
                <button type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-950/40 flex items-center gap-1.5">
                  <CheckCircle size={14} />
                  บันทึกจบไลฟ์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Task Modal ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-[#15151f] border border-slate-700/60 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/60 flex justify-between items-center bg-[#1a1a28]">
              <h3 className="font-bold text-sm text-white">เพิ่มงานใหม่</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveTask} className="p-5 space-y-4 bg-[#15151f] max-h-[70vh] overflow-y-auto">
              <div className="flex bg-[#0f0f17] p-1 rounded-xl border border-slate-700/60 gap-1">
                {['commission','stream','clip'].map(type => (
                  <button key={type} type="button" onClick={() => setTaskType(type)}
                    className={`flex-1 text-xs py-2 rounded-lg font-bold capitalize transition-all ${taskType === type ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                    {type}
                  </button>
                ))}
              </div>

              {/* Commission Form */}
              {taskType === 'commission' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-300 font-medium mb-1 block">ชื่องาน *</label>
                      <input required value={commName} onChange={e => setCommName(e.target.value)}
                        className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-medium mb-1 block">รายได้รวม (บาท)</label>
                      <input type="number" min="0" value={commRevenue} onChange={e => setCommRevenue(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-300 font-medium mb-1 block">วันเริ่มต้น</label>
                      <input type="date" required value={commStartDate} onChange={e => setCommStartDate(e.target.value)}
                        className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-medium mb-1 block">วันสิ้นสุด</label>
                      <input type="date" required value={commEndDate} onChange={e => setCommEndDate(e.target.value)}
                        className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none [color-scheme:dark]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-medium mb-1 block">VTuber ที่เกี่ยวข้อง</label>
                    <select value={commTalentId} onChange={e => setCommTalentId(e.target.value)}
                      className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                      <option value="">-- ไม่ระบุ --</option>
                      {talents.map(t => <option key={t.id} value={t.id}>{t.talent_name}</option>)}
                    </select>
                  </div>

                  {/* Partner split */}
                  <div className="bg-[#0f0f17] border border-slate-700/60 p-4 rounded-xl space-y-3">
                    <p className="text-xs font-bold text-slate-300">แบ่งรายได้ให้ทีมงาน</p>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <select value={partnerSelect} onChange={e => setPartnerSelect(e.target.value)}
                          className="w-full bg-[#15151f] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                          <option value="">-- เลือกทีมงาน --</option>
                          {teamMembers
                            .filter(member => member.id !== user.id && !selectedPartners.some(partner => partner.userId === member.id))
                            .map(member => (
                              <option key={member.id} value={`${member.id}|${member.display_name}`}>
                                {member.display_name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <button type="button" onClick={handleAddPartner}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-1 text-xs transition-colors">
                        <Plus size={15} /> เพิ่ม
                      </button>
                    </div>
                    <div className="space-y-2 pt-1 border-t border-slate-700">
                      <div className="flex items-center justify-between bg-indigo-900/20 p-2.5 rounded-lg border border-indigo-500/20">
                        <span className="text-xs font-bold text-indigo-300">{myProfile?.display_name ?? 'ฉัน'} (ส่วนที่เหลือจาก 90%)</span>
                        <span className="text-xs font-bold text-white">{myAmount.toLocaleString()} บาท</span>
                      </div>
                      {selectedPartners.map((partner, index) => (
                        <div key={partner.userId} className="flex items-center gap-2 bg-slate-800/50 p-2.5 rounded-lg border border-slate-700">
                          <button type="button" onClick={() => handleRemovePartner(partner.userId)} className="text-red-400 hover:bg-red-400/20 p-1 rounded-lg"><Trash2 size={13} /></button>
                          <span className="text-xs font-medium text-slate-200 flex-1">{partner.name}</span>
                          <input type="number" min="0" value={partner.amount} onChange={e => handlePartnerAmountChange(index, e.target.value)}
                            className="w-24 bg-[#15151f] border border-slate-600 rounded-lg px-2 py-1 text-xs text-right text-white focus:outline-none" />
                          <span className="text-xs text-slate-400">บ.</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Stream Form */}
              {taskType === 'stream' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 font-medium mb-1 block">หัวข้อการสตรีม *</label>
                    <input required value={streamTitle} onChange={e => setStreamTitle(e.target.value)}
                      className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-300 font-medium mb-1 block">เลือก VTuber *</label>
                      <select required value={streamTalentId} onChange={e => setStreamTalentId(e.target.value)}
                        className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                        <option value="">-- เลือก --</option>
                        {talents.map(t => <option key={t.id} value={t.id}>{t.talent_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-medium mb-1 block">เวลาเริ่ม</label>
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$"
                        maxLength={5}
                        value={streamStartTime}
                        onChange={e => setStreamStartTime(e.target.value)}
                        className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                        placeholder="20:00"
                        title="กรอกเวลาแบบ 24 ชั่วโมง เช่น 20:00"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-300 font-medium mb-1 block">Platform</label>
                      <div className="flex bg-[#15151f] p-1 rounded-xl border border-slate-700 gap-1">
                        {['YouTube','Twitch'].map(p => (
                          <button key={p} type="button" onClick={() => setStreamPlatform(p)}
                            className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-all ${streamPlatform === p ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>{p}</button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#0f0f17] p-3 rounded-xl border border-slate-700 flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200">ต้องการปกจากทีม</label>
                      <input type="checkbox" checked={streamNeedThumb} onChange={e => setStreamNeedThumb(e.target.checked)} className="w-4 h-4 rounded accent-purple-500" />
                    </div>
                  </div>
                </div>
              )}

              {/* Clip Form */}
              {taskType === 'clip' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 font-medium mb-1 block">หัวข้อคลิป / ไอเดีย *</label>
                    <input required value={clipTitle} onChange={e => setClipTitle(e.target.value)}
                      className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-300 font-medium mb-1 block">เลือก VTuber *</label>
                      <select required value={clipTalentId} onChange={e => setClipTalentId(e.target.value)}
                        className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                        <option value="">-- เลือก --</option>
                        {talents.map(t => <option key={t.id} value={t.id}>{t.talent_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-medium mb-1 block">รูปแบบ</label>
                      <div className="flex bg-[#15151f] p-1 rounded-xl border border-slate-700 gap-1">
                        <button type="button" onClick={() => setClipFormat('Short')}
                          className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-all ${clipFormat === 'Short' ? 'bg-pink-600 text-white' : 'text-slate-400'}`}>Shorts</button>
                        <button type="button" onClick={() => setClipFormat('Long')}
                          className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-all ${clipFormat === 'Long' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Full</button>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#0f0f17] p-3 rounded-xl border border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-200 font-medium">ต้องการบท/สคริปต์จากทีม</label>
                      <input type="checkbox" checked={clipNeedScript} onChange={e => setClipNeedScript(e.target.checked)} className="w-4 h-4 rounded accent-pink-500" />
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-700 pt-3">
                      <label className="text-xs text-slate-200 font-medium">ต้องการภาพปกคลิปจากทีม</label>
                      <input type="checkbox" checked={clipNeedThumb} onChange={e => setClipNeedThumb(e.target.checked)} className="w-4 h-4 rounded accent-pink-500" />
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={15} className="animate-spin" /> กำลังบันทึก...</> : 'บันทึกแผนงาน'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Card>
  )
}

// ══════════════════════════════════════════════════════════════
// 🟧 Tab 2 — VTuber Checklist
// แสดง commission ค้าง + สถานะ thumbnail/script ที่รอดำเนินการ
// ══════════════════════════════════════════════════════════════
function VTuberChecklistTab({ teamTasks, streams, shorts, toggleStreamThumbnail, toggleClipThumbnail, toggleScript }) {
  const activeCommissions = teamTasks.filter(t => t.status === 'pending')
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-3 pb-2.5 border-b border-white/[0.04]">
          <Layers size={13} className="text-indigo-400" /> Commission ที่รอดำเนินการ
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeCommissions.map(t => (
            <div key={t.id} className="bg-[#161622] p-3.5 rounded-xl border border-white/[0.04]">
              <p className="text-sm font-bold text-slate-200 mb-0.5">{t.title}</p>
              <p className="text-[11px] text-slate-500">กำหนดส่ง: {t.endDate?.split('-').reverse().join('/') ?? '-'}</p>
              <div className="mt-2.5 flex gap-1.5 flex-wrap">
                {t.partners?.map(p => (
                  <span key={p.name} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">ผู้ช่วย: {p.name}</span>
                ))}
              </div>
            </div>
          ))}
          {activeCommissions.length === 0 && <p className="text-xs text-slate-500 col-span-2 py-3">ไม่มี Commission ค้างอยู่</p>}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-3 pb-2.5 border-b border-white/[0.04]">
            <Video size={13} className="text-purple-400" /> ปกสตรีม (Thumbnails)
          </h3>
          <div className="space-y-2">
            {streams.filter(s => s.needsThumbnail && s.status !== 'done').map(s => (
              <div key={s.id} className="flex items-center justify-between bg-[#161622] p-3 rounded-xl border border-white/[0.04]">
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-bold text-slate-200 truncate">{s.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{s.talent} | {s.date?.split('-').reverse().join('/') ?? '-'}</p>
                </div>
                <button onClick={() => toggleStreamThumbnail(s.id)}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors
                    ${s.thumbnailDone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-red-500/10 text-red-400 border-red-500/25'}`}>
                  {s.thumbnailDone ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {s.thumbnailDone ? 'พร้อม' : 'ยังไม่ทำ'}
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-3 pb-2.5 border-b border-white/[0.04]">
            <Film size={13} className="text-pink-400" /> คลิปสั้น (Scripts & Thumbnails)
          </h3>
          <div className="space-y-2">
            {shorts.filter(c => (c.needsScript || c.needsThumbnail) && c.status !== 'done').map(s => (
              <div key={s.id} className="bg-[#161622] p-3 rounded-xl border border-white/[0.04]">
                <p className="text-xs font-bold text-slate-200 truncate mb-0.5">{s.idea}</p>
                <p className="text-[10px] text-slate-500 mb-2">{s.talent} | {s.date?.split('-').reverse().join('/') ?? '-'}</p>
                <div className="flex gap-2">
                  {s.needsScript && (
                    <button onClick={() => toggleScript(s.id)}
                      className={`flex-1 flex justify-center items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors
                        ${s.scriptDone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-red-500/10 text-red-400 border-red-500/25'}`}>
                      {s.scriptDone ? 'สคริปต์เสร็จ' : 'ยังไม่เขียนบท'}
                    </button>
                  )}
                  {s.needsThumbnail && (
                    <button onClick={() => toggleClipThumbnail(s.id)}
                      className={`flex-1 flex justify-center items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors
                        ${s.thumbnailDone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-red-500/10 text-red-400 border-red-500/25'}`}>
                      {s.thumbnailDone ? 'ปกพร้อม' : 'ยังไม่ทำปก'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 🟩 Tab 3 — Team Pipeline & Goals
// สรุปรายได้รายเดือน + Kanban Board ติดตามสถานะ commission
// ══════════════════════════════════════════════════════════════
function TeamPipelineTab({ teamTasks, streams, advanceTeamTask }) {
  const todoTasks     = teamTasks.filter(t => t.status === 'pending')
  const progressTasks = teamTasks.filter(t => t.status === 'in_progress')
  const doneTasks     = teamTasks.filter(t => t.status === 'done')
  const commissionFinancials = teamTasks.reduce((total, task) => {
    const financials = getCommissionFinancials(task)
    return {
      gross: total.gross + financials.gross,
      companyShare: total.companyShare + financials.companyShare,
      teamPool: total.teamPool + financials.teamPool,
    }
  }, { gross: 0, companyShare: 0, teamPool: 0 })
  const streamFinancials = streams.reduce((total, stream) => {
    const financials = getStreamFinancials(stream)
    return {
      gross: total.gross + financials.gross,
      companyShare: total.companyShare + financials.companyShare,
      talentShare: total.talentShare + financials.talentShare,
    }
  }, { gross: 0, companyShare: 0, talentShare: 0 })
  const companyRevenue = commissionFinancials.companyShare + streamFinancials.companyShare

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'ยอดบริษัท', subtitle: '60% จากไลฟ์ + 10% จากงานทีม', value: companyRevenue, icon: Wallet, cls: 'text-violet-300 border-violet-500/20 bg-violet-500/10' },
          { title: 'รายได้ทีมสุทธิ', subtitle: '90% ของ commission ก่อนแบ่งผู้ร่วมงาน', value: commissionFinancials.teamPool, icon: BarChart3, cls: 'text-indigo-300 border-indigo-500/20 bg-indigo-500/10' },
          { title: 'รายได้ VTuber', subtitle: '40% ของยอดไลฟ์ที่สรุปแล้ว', value: streamFinancials.talentShare, icon: Wallet, cls: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10' },
        ].map(({ title, subtitle, value, icon: Icon, cls }) => (
          <Card key={title} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">{title}</p>
                <p className={`text-2xl font-black mt-1 ${cls.split(' ')[0]}`}>฿{value.toLocaleString()}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${cls}`}>
                <Icon size={16} />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">{subtitle}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'รายได้ฝั่งทีมงาน (Team Revenue)', icon: BarChart3, iconCls: 'text-indigo-400', bars: [40,65,85,50], barCls: 'bg-indigo-500', bgCls: 'bg-indigo-900/25' },
          { title: 'รายได้ฝั่ง VTuber (Donates/Ads)',  icon: Wallet,   iconCls: 'text-emerald-400', bars: [55,40,75,95], barCls: 'bg-emerald-500', bgCls: 'bg-emerald-900/25' },
        ].map(({ title, icon: Icon, iconCls, bars, barCls, bgCls }) => (
          <Card key={title} className="p-4">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-2 mb-3">
              <Icon size={13} className={iconCls} /> {title}
            </h3>
            <div className="flex items-end gap-2.5 h-20">
              {bars.map((h, i) => (
                <div key={i} className={`flex-1 ${bgCls} rounded-t-md relative`}>
                  <div className={`absolute bottom-0 w-full ${barCls} rounded-t-md transition-all`} style={{ height: `${h}%` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 mt-1.5">
              {['สัปดาห์ 1','สัปดาห์ 2','สัปดาห์ 3','สัปดาห์ 4'].map(w => <span key={w}>{w}</span>)}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'To Do',       tasks: todoTasks,     dot: 'bg-indigo-500',               color: 'indigo' },
          { label: 'In Progress', tasks: progressTasks, dot: 'bg-amber-500 animate-pulse',  color: 'amber', borderCls: 'border-amber-500/25' },
          { label: 'Done',        tasks: doneTasks,     dot: 'bg-emerald-500',              color: 'done'  },
        ].map(({ label, tasks, dot, color, borderCls }) => (
          <Card key={label} className="p-4 flex flex-col min-h-[340px]">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <h3 className="text-sm font-bold text-white">{label}</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-bold bg-[#161622] px-2 py-0.5 rounded">{tasks.length}</span>
            </div>
            <div className="space-y-2 flex-1">
              {color === 'done' ? tasks.map(task => (
                <div key={task.id} className="bg-[#161622] border border-emerald-500/15 rounded-xl p-3 flex flex-col justify-between opacity-60 hover:opacity-90 transition-opacity">
                  <div>
                    <div className="flex justify-between gap-2 mb-1.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase bg-black/30 px-2 py-0.5 rounded">{task.category}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Done</span>
                    </div>
                    <h4 className="text-slate-500 line-through font-bold text-xs leading-snug">{task.title}</h4>
                  </div>
                  <div className="border-t border-white/[0.04] pt-2 mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-slate-600">{task.talent}</span>
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  </div>
                </div>
              )) : tasks.map(task => (
                <KanbanCard key={task.id} task={task} onAdvance={advanceTeamTask} advanceColor={color} borderCls={borderCls} />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── Sub-component: KanbanCard ───────────────────────────────
/** การ์ดใน Kanban Board แสดงชื่องาน priority และปุ่มเลื่อน status */
function KanbanCard({ task, onAdvance, advanceColor = 'indigo', borderCls = 'border-white/[0.05]' }) {
  // สีปุ่มลูกศร → ขึ้นอยู่กับ column ปัจจุบัน
  const hoverMap = { indigo: 'hover:bg-indigo-600', amber: 'hover:bg-amber-600' }
  return (
    <div className={`bg-[#161622] border ${borderCls} rounded-xl p-3 flex flex-col justify-between`}>
      <div>
        <div className="flex justify-between gap-2 mb-1.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase bg-black/30 px-2 py-0.5 rounded">{task.category}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(task.priority)}`}>{task.priority}</span>
        </div>
        <h4 className="text-slate-200 font-bold text-xs leading-snug">{task.title}</h4>
      </div>
      <div className="border-t border-white/[0.04] pt-2 mt-2 flex items-center justify-between">
        <span className="text-[10px] text-slate-500">{task.talent}</span>
        <button onClick={() => onAdvance(task.id)}
          className={`p-1 rounded-lg bg-[#1a1a27] ${hoverMap[advanceColor]} text-slate-400 hover:text-white transition-colors`}>
          <ChevronRightIcon size={14} />
        </button>
      </div>
    </div>
  )
}