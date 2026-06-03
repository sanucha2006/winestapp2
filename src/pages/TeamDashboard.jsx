// src/pages/TeamDashboard.jsx
// ─────────────────────────────────────────────────────────────
// หน้า Dashboard หลักของทีม Staff
// ประกอบด้วย 3 Tab:
//   1. Master Calendar  — ตารางงานรายเดือน พร้อมเพิ่ม/แก้ไขงาน
//   2. VTuber Checklist — ติดตาม thumbnails และ scripts
//   3. Team Pipeline    — Kanban + สรุปรายได้รายเดือน
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import {
  Layers, Calendar,
  Video, Film, CheckCircle2, AlertCircle,
  BarChart3, Wallet,
  ChevronRight as ChevronRightIcon,
  Loader2, Trash2
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Card from '../components/common/Card'
import MasterCalendar from '../components/calendar/MasterCalendar'
import { toMonthKey } from '../lib/calendarUtils'
import { getCommissionFinancials, getStreamFinancials } from '../lib/financeUtils'
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
  // เพิ่ม Tab ใหม่ที่นี่ แล้วเพิ่ม renderer ใน JSX ด้านล่าง
  const TABS = [
    { id: 'calendar', label: 'Master Calendar',  icon: Calendar     },
    { id: 'vtuber',   label: 'To Do List',          icon: CheckCircle2 },
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

// ══════════════════════════════════════════════════════════════
// 🟧 Tab 2 — VTuber Checklist
// แสดง commission ค้าง + สถานะ thumbnail/script ที่รอดำเนินการ
// ══════════════════════════════════════════════════════════════
function VTuberChecklistTab({ userId, teamTasks, streams, shorts, toggleStreamThumbnail, toggleClipThumbnail, toggleScript, advanceTeamTask, onDeleteEvent }) {
  const allCommissions = teamTasks
  const ownStreams = streams.filter(s => s.createdBy === userId)
  const ownShorts = shorts.filter(c => c.createdBy === userId)
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-3 pb-2.5 border-b border-white/[0.04]">
          <Layers size={13} className="text-indigo-400" /> Commission ทั้งหมด
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {allCommissions.map(t => (
            <div key={t.id} className={`p-3.5 rounded-xl border flex flex-col justify-between transition-opacity
              ${t.status === 'done' ? 'bg-[#0a1813] border-emerald-500/20 opacity-60' : 'bg-[#161622] border-white/[0.04]'}`}>
              <div>
                <div className="flex justify-between items-start gap-2 mb-0.5">
                  <p className="text-sm font-bold text-slate-200 truncate flex-1">{t.title}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                    t.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    t.status === 'in_progress' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}>
                    {t.status === 'done' ? 'สำเร็จ' : t.status === 'in_progress' ? 'กำลังทำ' : 'รอดำเนิน'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">กำหนดส่ง: {t.endDate?.split('-').reverse().join('/') ?? '-'}</p>
                <div className="mt-2.5 flex gap-1.5 flex-wrap">
                  {t.partners?.map(p => (
                    <span key={p.name} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">ผู้ช่วย: {p.name}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1.5 mt-3 border-t border-white/[0.04] pt-3">
                {t.status !== 'done' && (
                  <button onClick={() => advanceTeamTask(t.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-colors
                      bg-indigo-500/10 text-indigo-400 border-indigo-500/25 hover:bg-indigo-500/20">
                    <ChevronRightIcon size={12} />
                    {t.status === 'pending' ? 'เริ่มทำ' : 'สำเร็จ'}
                  </button>
                )}
                <button onClick={() => onDeleteEvent({ id: t.id, type: 'commission' })}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/25 hover:border-red-500/50">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {allCommissions.length === 0 && <p className="text-xs text-slate-500 col-span-2 py-3">ไม่มี Commission</p>}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-3 pb-2.5 border-b border-white/[0.04]">
            <Video size={13} className="text-purple-400" /> ปกสตรีม
          </h3>
          <div className="space-y-2">
            {ownStreams.filter(s => s.needsThumbnail && s.status !== 'done').map(s => (
              <div key={s.id} className="flex items-center justify-between bg-[#161622] p-3 rounded-xl border border-white/[0.04]">
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-bold text-slate-200 truncate">{s.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{s.talent} | {s.date?.split('-').reverse().join('/') ?? '-'}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <button onClick={() => toggleStreamThumbnail(s.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors
                      ${s.thumbnailDone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-amber-500/10 text-amber-400 border-amber-500/25'}`}>
                    {s.thumbnailDone ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {s.thumbnailDone ? 'พร้อม' : 'ยังไม่ทำ'}
                  </button>
                  <button onClick={() => onDeleteEvent({ id: s.id, type: 'stream' })}
                    className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/25 hover:border-red-500/50">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-3 pb-2.5 border-b border-white/[0.04]">
            <Film size={13} className="text-pink-400" /> Videos
          </h3>
          <div className="space-y-2">
            {ownShorts.filter(c => (c.needsScript || c.needsThumbnail) && c.status !== 'done').map(s => (
              <div key={s.id} className="bg-[#161622] p-3 rounded-xl border border-white/[0.04]">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <p className="text-xs font-bold text-slate-200 truncate flex-1">{s.idea}</p>
                  <button onClick={() => onDeleteEvent({ id: s.id, type: 'clip' })}
                    className="p-0.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/25 hover:border-red-500/50 shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">{s.talent} | {s.date?.split('-').reverse().join('/') ?? '-'}</p>
                <div className="flex gap-2">
                  {s.needsScript && (
                    <button onClick={() => toggleScript(s.id)}
                      className={`flex-1 flex justify-center items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors
                        ${s.scriptDone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-amber-500/10 text-amber-400 border-amber-500/25'}`}>
                      {s.scriptDone ? 'สคริปต์เสร็จ' : 'ยังไม่เขียนบท'}
                    </button>
                  )}
                  {s.needsThumbnail && (
                    <button onClick={() => toggleClipThumbnail(s.id)}
                      className={`flex-1 flex justify-center items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors
                        ${s.thumbnailDone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-amber-500/10 text-amber-400 border-amber-500/25'}`}>
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
  const commissionFinancials = doneTasks.reduce((total, task) => {
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
