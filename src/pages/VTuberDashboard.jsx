// src/pages/VTuberDashboard.jsx
// ─────────────────────────────────────────────────────────────
// หน้า Dashboard หลักของ VTuber (Talent)
// Root component: จัดการ state กลาง, โหลดข้อมูล, และส่ง props ลง Tab ย่อย
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  LayoutDashboard, Trophy,
  Star, Crown, Loader2, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { toMonthKey } from '../lib/calendarUtils'
import {
  getMyTalentProfile,
  getStreams,
  getClips,
  getQuestTransactions,
  submitQuest,
  getTalentStars,
  getTalentBilling,
  getVTuberAvailability,
  upsertVTuberAvailability,
} from '../lib/supabaseservice'

// ── Extracted Components ──
import Toast from '../components/common/Toast'
import OverviewTab from '../components/vtuber/OverviewTab'
import { GoalsTab } from '../components/vtuber/GoalsTab'

// ══════════════════════════════════════════════════════════════
// 🏠 ROOT COMPONENT — VTuberDashboard
// จัดการ state กลาง, โหลดข้อมูล, และส่ง props ลง Tab ย่อย
// ══════════════════════════════════════════════════════════════
export default function VTuberDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  // ── Global states ──
  const [talent, setTalent] = useState(null)                // เก็บโปรไฟล์ของตนเอง { id, talent_name, stars }
  const [streams, setStreams] = useState([])                // ลิสต์รายการสตรีมในเดือนนั้นๆ
  const [clips, setClips]   = useState([])                  // ลิสต์รายการคลิปสั้นในเดือนนั้นๆ
  const [quests, setQuests] = useState([])                  // เควสที่ได้รับมอบหมายทั้งหมด (transaction)
  const [billingRecords, setBillingRecords] = useState([])  // บันทึกรายการจ่ายเงิน/ส่วนแบ่งของตนเอง
  const [calMonth, setCalMonth] = useState(new Date())      // เดือนที่เลือกอยู่ ณ ปัจจุบันในระบบ

  // ── Availability & Cache states ──
  const [availabilityCache, setAvailabilityCache] = useState({}) // { "YYYY-MM": [1, 2, ...] }
  const [isEditMode, setIsEditMode] = useState(false)
  const [savedDays, setSavedDays] = useState([])
  const [editingDays, setEditingDays] = useState([])
  const [savingAvailability, setSavingAvailability] = useState(false)
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  // ── Loading & Errors ──
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [loadingQuests, setLoadingQuests]   = useState(false)
  const [loadingBilling, setLoadingBilling] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  // ── ฟังก์ชันแสดง Toast แจ้งเตือน ──
  const showToast = useCallback((message, success = true) => setToast({ message, success }), [])

  // ── Effect: โหลดข้อมูลโปรไฟล์ Talent หลัง User เข้าสู่ระบบสำเร็จ ──
  useEffect(() => {
    if (!user?.id) return
    const timer = setTimeout(() => {
      setLoadingProfile(true)
      setError(null)
      getMyTalentProfile(user.id)
        .then(data => {
          setTalent(data) // data = null ถ้า admin ยังไม่ได้เชื่อมโปรไฟล์
        })
        .catch(e => setError(e.message))
        .finally(() => setLoadingProfile(false))
    }, 0)
    return () => clearTimeout(timer)
  }, [user?.id])

  // ── Effect: โหลดข้อมูลสตรีมและคลิปสั้นตามเดือนที่กำหนด ──
  useEffect(() => {
    if (!talent?.id) return
    const timer = setTimeout(() => {
      const month = toMonthKey(calMonth)
      setLoadingCalendar(true)
      Promise.all([
        getStreams({ talentId: talent.id, month }),
        getClips({ talentId: talent.id, month }),
      ])
        .then(([s, c]) => { setStreams(s); setClips(c) })
        .catch(e => setError(e.message))
        .finally(() => setLoadingCalendar(false))
    }, 0)
    return () => clearTimeout(timer)
  }, [talent?.id, calMonth])

  // ── Effect: โหลดรายการเควสของตนเอง ──
  useEffect(() => {
    if (!talent?.id) return
    const timer = setTimeout(() => {
      setLoadingQuests(true)
      getQuestTransactions(talent.id)
        .then(setQuests)
        .catch(e => setError(e.message))
        .finally(() => setLoadingQuests(false))
    }, 0)
    return () => clearTimeout(timer)
  }, [talent?.id])

  // ── Effect: โหลดสถิติบิล/ส่วนแบ่งรายได้ ──
  useEffect(() => {
    if (!talent?.id) return
    const timer = setTimeout(() => {
      setLoadingBilling(true)
      getTalentBilling(talent.id)
        .then(setBillingRecords)
        .catch(e => setError(e.message))
        .finally(() => setLoadingBilling(false))
    }, 0)
    return () => clearTimeout(timer)
  }, [talent?.id])

  // ── Effect: โหลดวันทำงานโดยใช้ Frontend Cache ──
  const monthKey = useMemo(() => {
    const year = calMonth.getFullYear()
    const month = calMonth.getMonth() + 1
    return `${year}-${String(month).padStart(2, '0')}`
  }, [calMonth])

  useEffect(() => {
    if (!talent?.user_id) return

    // หากมีข้อมูลใน cache แล้ว ดึงมาใช้ได้เลย
    if (availabilityCache[monthKey] !== undefined) {
      setSavedDays(availabilityCache[monthKey])
      return
    }

    setLoadingAvailability(true)
    const [year, monthVal] = monthKey.split('-').map(Number)
    getVTuberAvailability(talent.user_id, year, monthVal)
      .then(days => {
        const sortedDays = (days || []).sort((a, b) => a - b)
        setSavedDays(sortedDays)
        setAvailabilityCache(prev => ({ ...prev, [monthKey]: sortedDays }))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingAvailability(false))
  }, [talent?.user_id, monthKey, availabilityCache])

  // ซิงก์ editingDays กับ savedDays เมื่อมีการโหลดข้อมูลสำเร็จหรือเปลี่ยนเดือน
  useEffect(() => {
    setEditingDays(savedDays)
  }, [savedDays])

  // ── Handlers: จัดการสลับโหมด แก้ไขวันทำงาน และบันทึก/ยกเลิก ──
  const handleToggleDay = useCallback((day) => {
    setEditingDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day)
      } else {
        return [...prev, day].sort((a, b) => a - b)
      }
    })
  }, [])

  const handleStartEdit = useCallback(() => {
    setEditingDays([...savedDays])
    setIsEditMode(true)
  }, [savedDays])

  const handleCancelEdit = useCallback(() => {
    setEditingDays([...savedDays])
    setIsEditMode(false)
  }, [savedDays])

  const handleSaveAvailability = useCallback(async () => {
    if (!talent?.user_id) return
    try {
      setSavingAvailability(true)
      const year = calMonth.getFullYear()
      const month = calMonth.getMonth() + 1

      await upsertVTuberAvailability(talent.user_id, year, month, editingDays)

      setSavedDays(editingDays)
      setAvailabilityCache(prev => ({ ...prev, [monthKey]: editingDays }))
      setIsEditMode(false)
      showToast('บันทึกวันทำงานสำเร็จ ✓', true)
    } catch (e) {
      showToast(e.message || 'เกิดข้อผิดพลาดในการบันทึกวันทำงาน', false)
    } finally {
      setSavingAvailability(false)
    }
  }, [talent?.user_id, calMonth, editingDays, monthKey, showToast])

  const handleMarkAllAvailable = useCallback(() => {
    const year = calMonth.getFullYear()
    const month = calMonth.getMonth() + 1
    const totalDays = new Date(year, month, 0).getDate()
    const allDays = Array.from({ length: totalDays }, (_, i) => i + 1)
    setEditingDays(allDays)
  }, [calMonth])

  const handleMarkNoneAvailable = useCallback(() => {
    setEditingDays([])
  }, [])

  // ── Handler: กดปุ่มส่งเควสไปตรวจสอบเงื่อนไขที่ Database RPC ──
  const handleSubmitQuest = useCallback(async (transactionId) => {
    if (!talent?.id) return
    try {
      const result = await submitQuest(transactionId, talent.id)
      if (!result) { showToast('ไม่ได้รับผลลัพธ์จากระบบ กรุณาลองใหม่', false); return }

      showToast(result.status_message, result.is_success)

      if (result.is_success) {
        // เมื่อสำเร็จ โหลดเควสและจำนวนดาวล่าสุดมาอัปเดตหน้า UI ทันที
        const [freshQuests, freshStars] = await Promise.all([
          getQuestTransactions(talent.id),
          getTalentStars(talent.id),
        ])
        setQuests(freshQuests)
        setTalent(prev => ({ ...prev, stars: freshStars }))
      } else {
        // อัปเดตค่าความคืบหน้าปัจจุบัน แม้จะยังไม่ผ่านเงื่อนไขเควส (เช่น สตรีมชั่วโมงเพิ่มขึ้น)
        setQuests(prev => prev.map(q =>
          q.id === transactionId ? { ...q, current_value: result.updated_value } : q
        ))
      }
    } catch (e) {
      showToast(e.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่', false)
    }
  }, [talent, showToast])

  // กรองเควสที่อยู่ในขอบเขตของปี-เดือนที่แสดงอยู่ในขณะนั้น
  const monthQuests = useMemo(() => {
    const yearStr = calMonth.getFullYear().toString()
    const monthStr = String(calMonth.getMonth() + 1).padStart(2, '0')
    const prefix = `${yearStr}-${monthStr}`
    return quests.filter(q => q.assigned_date?.startsWith(prefix))
  }, [quests, calMonth])

  // การตั้งค่าแท็บใช้งาน
  const TABS = [
    { id: 'overview', label: 'ตารางงาน & เควส', icon: LayoutDashboard },
    { id: 'goals',    label: 'เป้าหมาย & สถิติ',  icon: Trophy },
  ]

  // หน้าจอตอนกำลังโหลดข้อมูลหลัก
  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-violet-400 animate-spin" />
          <p className="text-sm text-slate-400">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  // หน้าจอแสดง Error
  if (error && !talent) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4">
        <div className="bg-rose-950/40 border border-rose-500/20 rounded-2xl p-6 max-w-sm text-center">
          <AlertTriangle size={32} className="text-rose-400 mx-auto mb-3" />
          <p className="text-sm text-rose-300 font-medium">{error}</p>
        </div>
      </div>
    )
  }

  // กรณีล็อกอินด้วยผู้ใช้อื่น/สตาฟ แต่ไม่มีโปรไฟล์ Talent ใน Database
  if (!talent && !loadingProfile) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4">
        <div className="bg-[#0d0d16] border border-white/[0.05] rounded-2xl p-8 max-w-sm text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto shadow-md">
            <Crown size={24} className="text-amber-400" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-200">ยังไม่มีโปรไฟล์ Talent</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              บัญชีนี้ยังไม่ได้ถูกเชื่อมกับโปรไฟล์ Talent<br />
              กรุณาติดต่อ Admin เพื่อให้สร้างและเชื่อมบัญชีให้
            </p>
          </div>
          <p className="text-[10px] text-slate-500 bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2 font-mono">
            user_id: {user?.id?.slice(0, 8)}...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050508] text-slate-200 antialiased pb-12">
      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-5">

        {/* ── Header Profile Bar — Obsidian styling with subtle violet glow shadow ── */}
        <div className="flex items-center justify-between bg-[#0d0d16] border border-white/[0.05] rounded-2xl px-5 py-3.5 shadow-md shadow-violet-950/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/15 border border-violet-500/25 flex items-center justify-center shadow-inner">
              <Crown size={16} className="text-violet-400" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">สวัสดี,</p>
              <p className="text-sm font-bold text-white leading-tight">
                {talent?.talent_name ?? '—'}
              </p>
            </div>
          </div>

          {/* ดาวสะสม (Stars) */}
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 px-4 py-2 rounded-xl">
            <Star size={15} className="text-amber-400 fill-amber-400" />
            <span className="text-base font-black text-amber-300 tabular-nums">
              {(talent?.stars ?? 0).toLocaleString()}
            </span>
            <span className="text-[10px] text-amber-500/80 font-medium">STARS</span>
          </div>
        </div>

        {/* ── Tab Switcher — Unified Slate Obsidian Card ── */}
        <div className="flex bg-[#0d0d16] border border-white/[0.05] rounded-xl p-1 shadow-md">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex-1 justify-center
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

        {/* ── Tab Contents Area ── */}
        {activeTab === 'overview' && (
          <OverviewTab
            talent={talent}
            streams={streams}
            clips={clips}
            quests={monthQuests}
            calMonth={calMonth}
            setCalMonth={setCalMonth}
            loadingCalendar={loadingCalendar}
            loadingQuests={loadingQuests}
            onSubmitQuest={handleSubmitQuest}
            availableDays={isEditMode ? editingDays : savedDays}
            isEditMode={isEditMode}
            onToggleDay={handleToggleDay}
            onStartEdit={handleStartEdit}
            onSave={handleSaveAvailability}
            onCancel={handleCancelEdit}
            onMarkAll={handleMarkAllAvailable}
            onMarkNone={handleMarkNoneAvailable}
            savingAvailability={savingAvailability}
            loadingAvailability={loadingAvailability}
          />
        )}
        {activeTab === 'goals' && (
          <GoalsTab
            talent={talent}
            quests={quests}
            streams={streams}
            clips={clips}
            billingRecords={billingRecords}
            calMonth={calMonth}
            setCalMonth={setCalMonth}
            loadingBilling={loadingBilling}
            onSubmitQuest={handleSubmitQuest}
          />
        )}
      </div>

      {/* แจ้งเตือน Toast ด้านล่างจอ */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
