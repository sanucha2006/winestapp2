// src/pages/AdminDashboard.jsx
// ─────────────────────────────────────────────────────────────
// หน้า Admin Dashboard หลัก
// ──────────────────────────────────────────────────────────────
// CACHING STRATEGY: "Lazy Mount + Keep Alive"
//   • Section component จะ mount ครั้งแรกเมื่อ Tab ถูกเยือนเท่านั้น
//   • หลังจากนั้นใช้ CSS `hidden` ซ่อน ไม่ unmount → ไม่ re-fetch
//   • `refreshKey` counter บังคับ re-fetch ทุก section เมื่อกด Refresh
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Sparkles, Users, LayoutDashboard, Trophy, Wallet,
  Loader2, AlertTriangle, RefreshCw,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { toMonthKey } from '../lib/calendarUtils'
import {
  getTalents,
  getTeamMembers,
  getStreams,
  getClips,
  getAllCommissions,
  mapCommission,
  mapStream,
  mapClip,
  createStream,
  createClip,
  createCommission,
  updateCommissionStatus,
  deleteCommission,
  deleteStream,
  deleteClip,
  endStream,
  getMyProfile,
} from '../lib/supabaseservice'

import Toast from '../components/common/Toast'
import AdminVTuberSection  from '../components/admin/AdminVTuberSection'
import AdminTeamSection    from '../components/admin/AdminTeamSection'
import AdminQuestSection   from '../components/admin/AdminQuestSection'
import AdminFinanceSection from '../components/admin/AdminFinanceSection'

// ── Tab Config ──
const TABS = [
  { id: 'vtuber',  label: 'VTuber Dashboard', icon: LayoutDashboard },
  { id: 'team',    label: 'Team Dashboard',    icon: Users           },
  { id: 'quests',  label: 'Quest Management',  icon: Trophy          },
  { id: 'finance', label: 'Finance & Revenue', icon: Wallet          },
]

/**
 * แสดงหน้า Admin Dashboard หลัก พร้อมระบบแท็บแบบ lazy mount, calendar data กลาง, และ section สำหรับดูแล VTuber/Team/Quest/Finance
 *
 * @param {void} ไม่มี parameter
 * @returns {React.ReactElement} หน้า Admin Portal พร้อมแท็บจัดการระบบ
 */
export default function AdminDashboard() {
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState('vtuber')
  // ชุด Tab ที่ถูก visit แล้ว — ใช้ mount ครั้งเดียว
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['vtuber']))

  // ── Refresh key — increment เพื่อบังคับ refetch ทุก section ──
  const [refreshKey, setRefreshKey] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // ── Global states ──
  const [myProfile,    setMyProfile]    = useState(null)
  const [talents,      setTalents]      = useState([])
  const [teamMembers,  setTeamMembers]  = useState([])
  const [commissions,  setCommissions]  = useState([])
  const [streams,      setStreams]      = useState([])
  const [clips,        setClips]        = useState([])
  const [calMonth,     setCalMonth]     = useState(new Date())

  const [loadingInit,     setLoadingInit]     = useState(true)
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [error,           setError]           = useState(null)
  const [toast,           setToast]           = useState(null)

  /**
   * แสดง Toast แจ้งผลลัพธ์ของ action ในหน้า Admin
   *
   * @param {string} message - ข้อความที่ต้องการแสดง
   * @param {boolean} [success=true] - ระบุว่าเป็นข้อความสำเร็จหรือข้อผิดพลาด
   * @returns {void} ไม่มีค่า return
   */
  const showToast = useCallback((message, success = true) => setToast({ message, success }), [])

  /**
   * เปลี่ยนแท็บและบันทึกว่าแท็บนั้นถูก visit แล้ว เพื่อให้ section mount ครั้งแรกเพียงครั้งเดียว
   *
   * @param {string} tabId - id ของแท็บที่ต้องการเปิด
   * @returns {void} ไม่มีค่า return
   */
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId)
    setVisitedTabs(prev => {
      if (prev.has(tabId)) return prev        // ไม่เปลี่ยน reference ถ้ามีแล้ว
      const next = new Set(prev)
      next.add(tabId)
      return next
    })
  }, [])

  /**
   * สั่งรีเฟรชข้อมูลทุก section ผ่าน refreshKey และ loading state ของปุ่ม Refresh
   *
   * @param {void} ไม่มี parameter
   * @returns {Promise<void>} Promise ที่ resolve หลังสั่งเพิ่ม refreshKey
   */
  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true)
    setRefreshKey(k => k + 1)
    // calendar จะ re-fetch เพราะ refreshKey เป็น dep (ดู useEffect ด้านล่าง)
    // isRefreshing จะ reset หลัง calendar โหลดเสร็จผ่าน ref
  }, [])

  // ใช้ ref แยกจาก state เพื่อเช็กว่า calendar effect เริ่มโหลดจริงหรือยัง
  const calendarLoadingRef = useRef(false)
  useEffect(() => {
    if (isRefreshing && !calendarLoadingRef.current) {
      // calendar effect ยังไม่ trigger → reset ทันที
      setIsRefreshing(false)
    }
  }, [isRefreshing])

  // โหลดข้อมูลพื้นฐานที่ทุก Admin section ใช้ร่วมกัน
  useEffect(() => {
    if (!user?.id) return
    const timer = setTimeout(async () => {
      setLoadingInit(true)
      setError(null)
      try {
        const [profile, allTalents, allTeam] = await Promise.all([
          getMyProfile(user.id),
          getTalents(),
          getTeamMembers(),
        ])
        setMyProfile(profile)
        setTalents(allTalents)
        setTeamMembers(allTeam)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoadingInit(false)
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [user?.id])

  // โหลดข้อมูล Calendar กลางตามเดือนที่เลือกและ refreshKey
  useEffect(() => {
    calendarLoadingRef.current = true
    const timer = setTimeout(async () => {
      setLoadingCalendar(true)
      const month = toMonthKey(calMonth)
      try {
        const [rawStreams, rawClips, rawComm] = await Promise.all([
          getStreams({ month }),
          getClips({ month }),
          getAllCommissions({ month }),
        ])
        setStreams(rawStreams.map(mapStream))
        setClips(rawClips.map(mapClip))
        setCommissions(rawComm.map(mapCommission))
      } catch (e) {
        showToast('โหลดปฏิทินไม่สำเร็จ: ' + e.message, false)
      } finally {
        setLoadingCalendar(false)
        calendarLoadingRef.current = false
        setIsRefreshing(false)  // ✅ reset เมื่อ calendar โหลดเสร็จ
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [calMonth, refreshKey, showToast]) // refreshKey เป็น dep → re-fetch เมื่อกด Refresh

  /**
   * สร้าง Event ใหม่จาก MasterCalendar แล้วอัปเดต state ฝั่ง client ตามประเภท Event
   *
   * @param {'stream'|'clip'|'commission'} type - ประเภท Event ที่ต้องการสร้าง
   * @param {Object} payload - ข้อมูลฟอร์มที่ส่งมาจาก CalendarEventFormModal
   * @param {string} date - วันที่ที่เลือกในปฏิทิน รูปแบบ YYYY-MM-DD
   * @returns {Promise<void>} Promise ที่ resolve เมื่อสร้างและอัปเดต state สำเร็จ
   */
  const handleCreateEvent = useCallback(async (type, payload, date) => {
    try {
      if (type === 'stream') {
        const raw = await createStream({ ...payload, streamDate: date, createdBy: user?.id })
        setStreams(prev => [...prev, mapStream({ ...raw, talents: null })])
      } else if (type === 'clip') {
        const raw = await createClip({ ...payload, publishDate: date, createdBy: user?.id })
        setClips(prev => [...prev, mapClip({ ...raw, talents: null })])
      } else if (type === 'commission') {
        const raw = await createCommission({ ...payload, ownerId: payload.createdBy ?? user?.id })
        setCommissions(prev => [mapCommission({ ...raw, commission_partners: [] }), ...prev])
      }
      showToast('เพิ่มรายการสำเร็จ ✓', true)
    } catch (e) {
      showToast('เพิ่มรายการไม่สำเร็จ: ' + e.message, false)
      throw e
    }
  }, [user?.id, showToast])

  /**
   * อัปเดต Event จาก MasterCalendar ตามข้อมูล update ที่ส่งเข้ามา
   *
   * @param {Object} event - Event เดิมที่ต้องการอัปเดต
   * @param {Object} updates - ข้อมูลที่ต้องการเปลี่ยนแปลง
   * @returns {Promise<void>} Promise ที่ resolve เมื่ออัปเดตเสร็จ
   */
  const handleUpdateEvent = useCallback(async (event, updates) => {
    try {
      if (event.type === 'commission') {
        await updateCommissionStatus(event.id, updates.status)
        setCommissions(prev => prev.map(c => c.id === event.id ? { ...c, status: updates.status } : c))
      }
      showToast('อัปเดตสำเร็จ ✓', true)
    } catch (e) {
      showToast('อัปเดตไม่สำเร็จ: ' + e.message, false)
    }
  }, [showToast])

  /**
   * ลบ Event ที่เลือกออกจากฐานข้อมูลและ state ฝั่ง client
   *
   * @param {Object} event - Event ที่ต้องการลบ พร้อม id และ type
   * @returns {Promise<void>} Promise ที่ resolve เมื่อลบเสร็จ
   */
  const handleDeleteEvent = useCallback(async (event) => {
    try {
      if (event.type === 'stream')          { await deleteStream(event.id);     setStreams(prev => prev.filter(s => s.id !== event.id))      }
      else if (event.type === 'clip')       { await deleteClip(event.id);       setClips(prev => prev.filter(c => c.id !== event.id))        }
      else if (event.type === 'commission') { await deleteCommission(event.id); setCommissions(prev => prev.filter(c => c.id !== event.id)) }
      showToast('ลบรายการสำเร็จ ✓', true)
    } catch (e) {
      showToast('ลบไม่สำเร็จ: ' + e.message, false)
    }
  }, [showToast])

  /**
   * บันทึกการจบไลฟ์ของ Stream Event และอัปเดต state รายการ stream
   *
   * @param {Object} stream - Stream Event ที่ต้องการจบไลฟ์
   * @param {Object} payload - ข้อมูลสรุปจบไลฟ์
   * @param {string} payload.endTime - เวลาจบไลฟ์ รูปแบบ HH:MM
   * @param {number} payload.revenue - รายได้รวมจากไลฟ์
   * @returns {Promise<void>} Promise ที่ resolve เมื่อบันทึกเสร็จ
   */
  const handleEndStream = useCallback(async (stream, { endTime, revenue }) => {
    try {
      await endStream(stream.id, { endTime, revenue })
      setStreams(prev => prev.map(s => s.id === stream.id ? { ...s, status: 'done', endTime, revenue } : s))
      showToast('บันทึกสิ้นสุด Stream สำเร็จ ✓', true)
    } catch (e) {
      showToast('บันทึกไม่สำเร็จ: ' + e.message, false)
    }
  }, [showToast])

  // ── Loading Screen ──
  if (loadingInit) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-violet-400 animate-spin" />
          <p className="text-sm text-slate-400">กำลังโหลด Admin Portal...</p>
        </div>
      </div>
    )
  }

  // ── Error Screen ──
  if (error) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4">
        <div className="bg-rose-950/40 border border-rose-500/20 rounded-2xl p-6 max-w-sm text-center">
          <AlertTriangle size={32} className="text-rose-400 mx-auto mb-3" />
          <p className="text-sm text-rose-300 font-medium">{error}</p>
        </div>
      </div>
    )
  }

  // ── Shared section props ──
  const calendarProps = {
    userId:           user?.id,
    myProfile,
    commissions,
    streams,
    clips,
    loadingCalendar,
    calMonth,
    onMonthChange:    setCalMonth,
    onCreateEvent:    handleCreateEvent,
    onUpdateEvent:    handleUpdateEvent,
    onDeleteEvent:    handleDeleteEvent,
  }

  return (
    <div className="min-h-screen bg-[#050508] text-slate-200 antialiased pb-12">
      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between bg-[#0d0d16] border border-white/[0.05] rounded-2xl px-5 py-3.5 shadow-md shadow-violet-950/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/15 border border-violet-500/25 flex items-center justify-center">
              <Sparkles size={16} className="text-violet-400" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Admin Portal</p>
              <p className="text-sm font-bold text-white leading-tight">
                {myProfile?.display_name ?? 'Administrator'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* ── Refresh All Button ── */}
            <button
              id="admin-refresh-btn"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              title="รีเฟรชข้อมูลทั้งหมด"
              className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg
                bg-white/[0.03] hover:bg-violet-500/10 text-slate-400 hover:text-violet-300
                border border-white/[0.06] hover:border-violet-500/20 transition-all
                disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <RefreshCw size={11} className={isRefreshing ? 'animate-spin text-violet-400' : ''} />
              <span className="hidden sm:inline">
                {isRefreshing ? 'กำลังรีเฟรช...' : 'Refresh'}
              </span>
            </button>

            {/* ── VTuber count badge ── */}
            <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-white/[0.02] border border-white/[0.04] px-3 py-1.5 rounded-lg">
              <Users size={11} className="text-violet-400" />
              <span>{talents.length} Active VTubers</span>
            </div>
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
                id={`admin-tab-${tab.id}`}
                onClick={() => handleTabChange(tab.id)}
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

        {/* ══════════════════════════════════════════════════════
            Tab Content — Lazy Mount + Keep Alive
            • visitedTabs.has(id) → mount เมื่อเยือนครั้งแรก
            • className="hidden" → ซ่อน แต่ไม่ unmount → ไม่ re-fetch
        ══════════════════════════════════════════════════════ */}

        {/* Tab 1: VTuber Dashboard */}
        {visitedTabs.has('vtuber') && (
          <div className={activeTab === 'vtuber' ? '' : 'hidden'}>
            <AdminVTuberSection
              {...calendarProps}
              talents={talents}
              teamMembers={teamMembers}
              onEndStream={handleEndStream}
              refreshKey={refreshKey}
            />
          </div>
        )}

        {/* Tab 2: Team Dashboard */}
        {visitedTabs.has('team') && (
          <div className={activeTab === 'team' ? '' : 'hidden'}>
            <AdminTeamSection
              {...calendarProps}
              teamMembers={teamMembers}
              talents={talents}
              refreshKey={refreshKey}
            />
          </div>
        )}

        {/* Tab 3: Quest Management */}
        {visitedTabs.has('quests') && (
          <div className={activeTab === 'quests' ? '' : 'hidden'}>
            <AdminQuestSection
              talents={talents}
              showToast={showToast}
              refreshKey={refreshKey}
            />
          </div>
        )}

        {/* Tab 4: Finance & Revenue */}
        {visitedTabs.has('finance') && (
          <div className={activeTab === 'finance' ? '' : 'hidden'}>
            <AdminFinanceSection
              showToast={showToast}
              refreshKey={refreshKey}
            />
          </div>
        )}

      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
