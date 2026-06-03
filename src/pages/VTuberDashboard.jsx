// src/pages/VTuberDashboard.jsx
// ─────────────────────────────────────────────────────────────
// หน้า Dashboard หลักของ VTuber (Talent)
// ปรับปรุงธีมสีเป็น Premium Dark Obsidian & Amethyst Theme
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  LayoutDashboard, Trophy, CheckCircle2, Star,
  Target, Flame, ChevronLeft, ChevronRight, X,
  Crown, Loader2, AlertTriangle, Sparkles, Tv2,
  Film, Clock, RefreshCw, ChevronDown, ChevronUp, Zap, Banknote, Lock,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import MasterCalendar from '../components/calendar/MasterCalendar'
import { THAI_MONTHS, toMonthKey } from '../lib/calendarUtils'
import {
  getMyTalentProfile,
  getStreams,
  getClips,
  getQuestTransactions,
  submitQuest,
  getTalentStars,
  getTalentBilling,
} from '../lib/supabaseservice'

// ══════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS (ฟังก์ชันช่วยคำนวณ & แปลงข้อมูล)
// ══════════════════════════════════════════════════════════════

/**
 * รายละเอียดการกำหนดสีและข้อความของแต่ละประเภทความถี่เควส (รายวัน, รายสัปดาห์, รายเดือน)
 * ปรับโทนสีพาสเทลระดับพรีเมียม สบายตาและเข้ากับพื้นหลังมืด
 */
const FREQ_CONFIG = {
  daily:   { label: 'รายวัน',     color: 'cyan',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   text: 'text-cyan-400',   dot: 'bg-cyan-400' },
  weekly:  { label: 'รายสัปดาห์', color: 'violet', bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', dot: 'bg-violet-400' },
  monthly: { label: 'รายเดือน',   color: 'amber',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-400',  dot: 'bg-amber-400' },
}

/**
 * รายละเอียดการกำหนดไอคอน ชื่อเรียก และหน่วยนับ ของประเภทเป้าหมายเควส
 */
const TARGET_CONFIG = {
  short_video: { icon: Film,     label: 'คลิปสั้น', unit: 'คลิป' },
  livestream:  { icon: Tv2,      label: 'ไลฟ์สตรีม', unit: 'ชั่วโมง' },
}

// ══════════════════════════════════════════════════════════════
// 🎨 UI COMPONENTS (Shared Components)
// ══════════════════════════════════════════════════════════════

/**
 * Skeleton Loader สำหรับใช้ตอนกำลังดาวน์โหลดข้อมูล
 */
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/[0.04] rounded-lg ${className}`} />
}

/**
 * Toast Notification แจ้งเตือนผลการส่งเควสหรือการกระทำต่างๆ
 */
function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [toast, onDismiss])

  if (!toast) return null
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold transition-all animate-in slide-in-from-bottom-4 duration-300
      ${toast.success
        ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300 backdrop-blur-md'
        : 'bg-rose-950/90 border-rose-500/40 text-rose-300 backdrop-blur-md'}`}>
      {toast.success ? <Sparkles size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-rose-400" />}
      <span>{toast.message}</span>
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  )
}

/**
 * กล่องแสดงตัวเลขสถิติขนาดเล็ก (ในหน้าสถิติ & เป้าหมาย)
 */
function StatMini({ icon, value, label }) {
  return (
    <div className="bg-[#13131f] border border-white/[0.05] rounded-xl p-4 text-center flex flex-col items-center justify-center transition-all hover:border-violet-500/20 hover:bg-[#161625]/80">
      <div className="text-violet-400 mb-2">{icon}</div>
      <div className="text-base font-black text-white leading-tight">{value}</div>
      <div className="text-[10px] text-slate-400 mt-1 leading-tight">{label}</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 🏠 ROOT COMPONENT (VTuberDashboard)
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

// ══════════════════════════════════════════════════════════════
// 🗓️ TAB 1: OVERVIEW TAB (ภาพรวมปฏิทิน และ รายการเควสประจำเดือน)
// ══════════════════════════════════════════════════════════════
function OverviewTab({ streams, clips, quests, calMonth, setCalMonth, loadingCalendar, loadingQuests, onSubmitQuest }) {
  // แบ่งกลุ่มเควสตามความถี่ (รายวัน, รายสัปดาห์, รายเดือน)
  const questsByFreq = useMemo(() => {
    const groups = { daily: [], weekly: [], monthly: [] }
    quests.forEach(tx => {
      const freq = tx.quests?.frequency
      if (freq && groups[freq]) groups[freq].push(tx)
    })
    return groups
  }, [quests])

  // จำนวนเควสในเดือนปัจจุบันที่ยังทำไม่เสร็จ
  const activeQuestCount = useMemo(() =>
    quests.filter(q => !q.is_done).length, [quests])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        <div className="lg:col-span-3">
          <MasterCalendar
            role="vtuber"
            currentDate={calMonth}
            onMonthChange={setCalMonth}
            streams={streams}
            clips={clips}
            loading={loadingCalendar}
            permissions={{
              canCreate: false,
              canEditStatus: false,
              canDelete: false,
              canEndStream: false,
              canViewFinancials: false,
              canFilterAllTalents: false,
            }}
          />
        </div>

        {/* ── ส่วนที่ 2: เควสประจำเดือน — (2 ใน 5 ส่วนบน Desktop) ── */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Target size={13} className="text-violet-400" /> เควสของฉัน
            </h3>
            {activeQuestCount > 0 && (
              <span className="text-[10px] bg-[#141420] text-violet-300 px-2 py-0.5 rounded-full font-bold border border-violet-500/20">
                {activeQuestCount} รายการ
              </span>
            )}
          </div>

          {loadingQuests ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : quests.length === 0 ? (
            <div className="bg-[#0d0d16] border border-white/[0.05] rounded-2xl p-6 text-center shadow-md">
              <Target size={28} className="text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">ยังไม่มีเควสที่ได้รับมอบหมาย</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
              {['daily','weekly','monthly'].map(freq => {
                const txs = questsByFreq[freq]
                if (!txs.length) return null
                const cfg = FREQ_CONFIG[freq]
                return (
                  <div key={freq} className="space-y-1.5">
                    {/* ส่วนหัวกลุ่มความถี่เควส */}
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg mb-1.5 ${cfg.bg} border ${cfg.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      <span className={`text-[10px] font-bold ${cfg.text}`}>{cfg.label}</span>
                    </div>
                    {/* ลิสต์การ์ดเควสภายใต้กลุ่ม */}
                    {txs.map(tx => (
                      <QuestCard key={tx.id} tx={tx} onSubmit={onSubmitQuest} />
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 🃏 CARD COMPONENT: QUEST CARD (แสดงข้อมูลเควส ความคืบหน้า และปุ่มตรวจสอบส่งงาน)
// ══════════════════════════════════════════════════════════════
function QuestCard({ tx, onSubmit }) {
  const [submitting, setSubmitting] = useState(false) // สถานะกำลังส่งเควสไปตรวจ
  const [expanded, setExpanded] = useState(false)     // เปิด/ปิด การแสดงรายละเอียดรายละเอียดเพิ่มเติม

  const q          = tx.quests ?? {}
  const cfg        = FREQ_CONFIG[q.frequency] ?? FREQ_CONFIG.weekly
  const targetCfg  = TARGET_CONFIG[q.target_type] ?? TARGET_CONFIG.short_video
  const TargetIcon = targetCfg.icon

  // คำนวณร้อยละของความสำเร็จ
  const current  = tx.current_value ?? 0
  const target   = q.target_value ?? 1
  const pct      = Math.min(100, Math.round((current / target) * 100))
  const isDone   = tx.is_done

  // ฟังก์ชันควบคุมปุ่มตรวจสอบ/ส่งเควส
  const handleSubmit = async () => {
    if (submitting || isDone) return
    setSubmitting(true)
    try { await onSubmit(tx.id) }
    finally { setSubmitting(false) }
  }

  return (
    <div className={`rounded-xl border transition-all mb-1.5
      ${isDone
        ? 'bg-[#0a1813] border-emerald-500/20 text-slate-300'
        : 'bg-[#0d0d16] border-white/[0.05] hover:border-violet-500/20 hover:bg-[#11111d]'}`}>
      
      {/* ส่วนเนื้อหาหลัก */}
      <div className="flex items-start gap-2.5 p-3">
        <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0
          ${isDone ? 'bg-emerald-500/20 text-emerald-400' : cfg.bg}`}>
          {isDone
            ? <CheckCircle2 size={13} />
            : <TargetIcon size={13} className={cfg.text} />}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold leading-snug ${isDone ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
            {q.title ?? '—'}
          </p>

          {/* แถบความคืบหน้า (Progress Bar) */}
          {!isDone && (
            <div className="mt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-400">
                  {current}/{target} {targetCfg.unit}
                </span>
                <span className="text-[10px] font-bold text-slate-300">{pct}%</span>
              </div>
              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500
                    ${pct >= 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {isDone && (
            <p className="text-[10px] text-emerald-400 mt-1 font-medium flex items-center gap-1">
              <span>สำเร็จแล้ว! ได้รับ</span>
              <span className="flex items-center gap-0.5 text-amber-400 font-bold bg-amber-500/10 px-1 rounded">{q.reward_stars} ⭐</span>
            </p>
          )}
        </div>

        {/* ปุ่มลูกศรเพื่อดูรายละเอียด (แสดงก็ต่อเมื่อมี Description) */}
        {q.description && (
          <button onClick={() => setExpanded(p => !p)} className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 mt-0.5">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>

      {/* คำอธิบายแบบขยายเพิ่มเติม (Expandable Area) */}
      {expanded && q.description && (
        <div className="px-3 pb-2 -mt-1">
          <p className="text-[10px] text-slate-400 leading-relaxed bg-[#13131f] rounded-lg px-3 py-2 border border-white/[0.03]">
            {q.description}
          </p>
        </div>
      )}

      {/* ส่วนแสดงของรางวัล และ ปุ่มกดเคลม/ส่งเควส */}
      {!isDone && (
        <div className="flex items-center justify-between px-3 pb-3 gap-2 border-t border-white/[0.03] pt-2 mt-1">
          <div className="flex items-center gap-1 text-[10px] text-amber-500/80">
            <Star size={10} className="fill-amber-500/80" />
            <span className="font-bold">{q.reward_stars ?? 0}</span>
            <span className="text-amber-600/70">stars</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer
              ${pct >= 100
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40'
                : 'bg-violet-600/85 hover:bg-violet-600 text-white'}`}
          >
            {submitting
              ? <><Loader2 size={11} className="animate-spin" /> ตรวจสอบ...</>
              : <><RefreshCw size={11} /> ส่งเควส</>}
          </button>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 🏆 TAB 2: GOALS TAB (ภาพรวมสถิติความสำเร็จ และ เส้นทางการพัฒนา S-curve)
// ══════════════════════════════════════════════════════════════
export function GoalsTab({
  quests,
  streams,
  clips,
  billingRecords,
  calMonth,
  setCalMonth,
  loadingBilling,
  onSubmitQuest
}) {
  const [selectedWeek, setSelectedWeek] = useState(1)       // สัปดาห์ที่ผู้ใช้เลือก (1-5 หรือ 'milestone')
  const [isWeekModalOpen, setIsWeekModalOpen] = useState(false) // สถานะเปิด/ปิด modal สัปดาห์

  const year = calMonth.getFullYear()
  const month = calMonth.getMonth()

  // ── 1. ส่วนแบ่งรายได้ของ Talent ในเดือนปัจจุบัน ──
  const currentMonthBilling = useMemo(() => {
    const periodStr = toMonthKey(calMonth)
    const record = billingRecords.find(r => r.period === periodStr)
    return record ? (Number(record.talent_cut) || 0) : 0
  }, [billingRecords, calMonth])

  // ── 2. ยอดเวลารวมในการไลฟ์สตรีมทั้งหมดที่สถานะเป็น 'done' ──
  const totalStreamMinutes = useMemo(() => {
    return streams
      .filter(s => s.status === 'done')
      .reduce((sum, s) => {
        if (!s.start_time || !s.end_time) return sum
        const [sh, sm] = s.start_time.split(':').map(Number)
        const [eh, em] = s.end_time.split(':').map(Number)
        let startMin = sh * 60 + sm
        let endMin = eh * 60 + em
        if (endMin < startMin) endMin += 24 * 60
        return sum + (endMin - startMin)
      }, 0)
  }, [streams])

  const streamHoursText = useMemo(() => {
    const h = Math.floor(totalStreamMinutes / 60)
    const m = totalStreamMinutes % 60
    return `${h} ชม. ${m} น.`
  }, [totalStreamMinutes])

  // ── 3. จำนวนคลิปสั้นที่ทำเสร็จในเดือนนั้นๆ ──
  const totalShortClips = useMemo(() => {
    return clips.filter(c => c.format === 'Short' && c.status === 'done').length
  }, [clips])

  // ── 4. จัดกลุ่มเควสตามปี-เดือนที่กำหนด ──
  const monthQuests = useMemo(() => {
    const yearStr = year.toString()
    const monthStr = String(month + 1).padStart(2, '0')
    const prefix = `${yearStr}-${monthStr}`
    return quests.filter(q => q.assigned_date?.startsWith(prefix))
  }, [quests, year, month])

  const completedQuestsCount = useMemo(() => {
    return monthQuests.filter(q => q.is_done).length
  }, [monthQuests])

  const monthlyCompletionPct = useMemo(() => {
    const total = monthQuests.length
    if (total === 0) return 0
    return Math.round((completedQuestsCount / total) * 100)
  }, [monthQuests, completedQuestsCount])

  // ── 5. ข้อความสัญญาร่วมสนุก/คำชมตามร้อยละความสำเร็จของเควส ──
  const encouragement = useMemo(() => {
    const pct = monthlyCompletionPct
    if (pct === 100) {
      return {
        title: 'ยอดเยี่ยมที่สุด! 🎉',
        desc: 'คุณทำภารกิจครบถ้วน 100% ในเดือนนี้แล้ว สตาฟทุกคนภูมิใจในตัวคุณมากนะ! รักษาระดับดาวและผลงานที่ยอดเยี่ยมนี้ไว้ต่อไปนะคนเก่ง! 🌟👑',
        badge: 'Completed 100%'
      }
    } else if (pct >= 75) {
      return {
        title: 'อีกนิดเดียวเท่านั้น! 🚀',
        desc: 'ใกล้ความจริงแล้วจ้า! อีกนิดเดียวจะครบ 100% แล้วนะ สู้ ๆ นะทีมงานหลังบ้านคอยเชียร์และสนับสนุนคุณอยู่เสมอ! 💖✨',
        badge: 'เกือบสมบูรณ์'
      }
    } else if (pct >= 40) {
      return {
        title: 'ทำได้ดีมากแล้ว! ☕',
        desc: 'ความพยายามของคุณเห็นผลแล้ว ค่อย ๆ ก้าวไปทีละนิดนะ เหนื่อยก็พักผ่อนบ้าง รักษาสุขภาพด้วยนะจ๊ะ สู้ ๆ! 🌟',
        badge: 'กำลังพยายามอย่างดี'
      }
    } else if (pct > 0) {
      return {
        title: 'ก้าวแรกเริ่มต้นแล้ว! ✌️',
        desc: 'เริ่มต้นได้ดีแล้วจ้า! มาพยายามไปด้วยกันนะ สตาฟพร้อมช่วยเหลือคุณเสมอในทุกไลฟ์และคลิปสั้น! 🎈',
        badge: 'เริ่มต้นแล้ว'
      }
    } else {
      return {
        title: 'เริ่มเดือนใหม่อย่างสดใส! 🌸',
        desc: 'ยินดีต้อนรับสู่เดือนนี้จ้า! มีเป้าหมายใหม่ ๆ รอให้คุณพิชิตอยู่นะ มาตั้งใจลุยไปด้วยกันเลย! ✨',
        badge: 'ไม่มีความคืบหน้า'
      }
    }
  }, [monthlyCompletionPct])

  // ── 6. เงื่อนไขการล็อกปุ่มสัปดาห์ในอนาคต (ล็อกไม่ให้กด และมีไอคอน Lock ชัดเจน) ──
  const isWeekLocked = useCallback((weekNum) => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() // 0-11
    const currentDay = today.getDate()

    const selYear = calMonth.getFullYear()
    const selMonth = calMonth.getMonth()

    // ปีหรือเดือนในอนาคต → ล็อกทั้งหมด
    if (selYear > currentYear) return true
    if (selYear < currentYear) return false
    if (selMonth > currentMonth) return true
    if (selMonth < currentMonth) return false

    // ปีและเดือนตรงกับปัจจุบัน: ตรวจสอบวันที่เริ่มต้นของแต่ละสัปดาห์ (1, 2, 3, 4, 5)
    const weekStartDays = [0, 1, 8, 15, 22, 29]
    return currentDay < weekStartDays[weekNum]
  }, [calMonth])

  const getWeekRelativeState = useCallback((weekNum) => {
    const today = new Date()
    const selYear = calMonth.getFullYear()
    const selMonth = calMonth.getMonth()

    if (selYear < today.getFullYear()) return 'past'
    if (selYear > today.getFullYear()) return 'future'
    if (selMonth < today.getMonth()) return 'past'
    if (selMonth > today.getMonth()) return 'future'

    const day = today.getDate()
    if (day < 8) return weekNum === 1 ? 'current' : weekNum < 1 ? 'past' : 'future'
    if (day < 15) return weekNum === 2 ? 'current' : weekNum < 2 ? 'past' : 'future'
    if (day < 22) return weekNum === 3 ? 'current' : weekNum < 3 ? 'past' : 'future'
    if (day < 29) return weekNum === 4 ? 'current' : weekNum < 4 ? 'past' : 'future'
    return weekNum === 5 ? 'current' : weekNum < 5 ? 'past' : 'future'
  }, [calMonth])

  const allWeeksAvailable = useMemo(() => {
    return [1, 2, 3, 4, 5].every(weekNum => !isWeekLocked(weekNum))
  }, [isWeekLocked])

  // เงื่อนไขในการล็อก Milestone ประจำเดือน (จะเปิดเมื่อทุกสัปดาห์สามารถเข้าดูได้)
  const isMilestoneLocked = useMemo(() => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()

    const selYear = calMonth.getFullYear()
    const selMonth = calMonth.getMonth()

    if (selYear > currentYear) return true
    if (selYear < currentYear) return false
    if (selMonth > currentMonth) return true
    return !allWeeksAvailable
  }, [calMonth, allWeeksAvailable])

  // ── 7. จัดโครงสร้างข้อมูลเควสประจำแต่ละสัปดาห์ ──
  const weeksData = useMemo(() => {
    return [1, 2, 3, 4, 5].map(weekNum => {
      const weekQuests = monthQuests.filter(tx => {
        if (!tx.assigned_date) return false
        const day = Number(tx.assigned_date.split('-')[2])
        if (weekNum === 1) return day >= 1 && day <= 7
        if (weekNum === 2) return day >= 8 && day <= 14
        if (weekNum === 3) return day >= 15 && day <= 21
        if (weekNum === 4) return day >= 22 && day <= 28
        return day >= 29
      })

      const total = weekQuests.length
      const done = weekQuests.filter(q => q.is_done).length
      // สถานะความคืบหน้าของสัปดาห์
      const status = total === 0 ? 'none' : (done === total ? 'completed' : (done > 0 ? 'in_progress' : 'pending'))

      return {
        weekNum,
        quests: weekQuests,
        total,
        done,
        status,
        dateRange: getWeekDateRange(year, month, weekNum)
      }
    })
  }, [monthQuests, year, month])

  // ดึงรายการเควสเฉพาะสัปดาห์ที่ผู้ใช้กำลังกดเลือกเปิดดู
  const activeQuests = useMemo(() => {
    if (typeof selectedWeek !== 'number') return []
    return weeksData[selectedWeek - 1]?.quests ?? []
  }, [selectedWeek, weeksData])

  const activeDateRange = useMemo(() => {
    if (typeof selectedWeek !== 'number') return ''
    return weeksData[selectedWeek - 1]?.dateRange ?? ''
  }, [selectedWeek, weeksData])

  // ── 8. จัดสเตจและลำดับการพล็อตปุ่ม S-curve สำหรับหน้าจอ Desktop ──
  // แถวที่ 1: สัปดาห์ที่ 1 → สัปดาห์ที่ 2 → สัปดาห์ที่ 3
  // แถวที่ 2: Milestone  ← สัปดาห์ที่ 5 ← สัปดาห์ที่ 4
  const desktopCells = useMemo(() => {
    return [
      { type: 'week', weekNum: 1, data: weeksData[0] },
      { type: 'week', weekNum: 2, data: weeksData[1] },
      { type: 'week', weekNum: 3, data: weeksData[2] },
      { type: 'milestone', weekNum: 'milestone', data: null },
      { type: 'week', weekNum: 5, data: weeksData[4] },
      { type: 'week', weekNum: 4, data: weeksData[3] }
    ]
  }, [weeksData])

  return (
    <div className="space-y-6">

      {/* ส่วนควบคุม และ แสดงหัวข้อเดือน — Obsidian Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0d0d16] border border-white/[0.05] p-4 rounded-2xl shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-slate-200">เป้าหมาย & สถิติรายเดือน</h3>
          <p className="text-xs text-slate-400">ผลงานและความสำเร็จของคุณในเดือนนี้</p>
        </div>
        
        <div className="flex items-center gap-1.5 bg-[#141420] px-2.5 py-1 rounded-xl border border-white/[0.04]">
          <button onClick={() => setCalMonth(new Date(year, month - 1, 1))}
            className="text-slate-400 hover:text-white p-0.5 transition-colors">
            <ChevronLeft size={15} />
          </button>
          <span className="text-xs font-bold text-slate-300 min-w-[110px] text-center">
            {THAI_MONTHS[month]} {year}
          </span>
          <button onClick={() => setCalMonth(new Date(year, month + 1, 1))}
            className="text-slate-400 hover:text-white p-0.5 transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* สถิติต่างๆ ในเดือน (Stars & Achievements Grid) — Premium styling */}
      <div className="bg-[#0d0d16] border border-white/[0.05] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-violet-500/10 p-1.5 rounded-lg border border-violet-500/20">
            <Trophy size={14} className="text-violet-400" />
          </div>
          <h3 className="text-xs font-bold text-slate-200">สรุปผลงาน</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <StatMini
            icon={<Banknote size={16} />}
            value={loadingBilling ? '...' : `${currentMonthBilling.toLocaleString()} บาท`}
            label="ส่วนแบ่งรายได้ของคุณ"
          />
          <StatMini
            icon={<Clock size={16} />}
            value={streamHoursText}
            label="เวลาสตรีมทั้งหมด"
          />
          <StatMini
            icon={<Film size={16} />}
            value={`${totalShortClips} คลิป`}
            label="จำนวนคลิปสั้น"
          />
          <StatMini
            icon={<CheckCircle2 size={16} />}
            value={`${completedQuestsCount} เควส`}
            label="จำนวนเควสที่สำเร็จ"
          />
        </div>
      </div>

      {/* ── แผนที่เส้นทางสู่ความสำเร็จ (Success Journey Timeline) ── */}
      <div className="bg-[#0d0d16] border border-white/[0.05] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Flame size={13} className="text-rose-400 animate-pulse" /> เส้นทางสู่ความสำเร็จ
          </h3>
          {monthQuests.length > 0 && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
              ผ่านแล้ว {completedQuestsCount}/{monthQuests.length} เควส ({monthlyCompletionPct}%)
            </span>
          )}
        </div>

        {/* ── 1. เส้นทาง S-curve สำหรับ Desktop (หน้าจอ md ขึ้นไป) ── */}
        <div className="hidden md:grid grid-cols-3 gap-y-14 gap-x-8 relative py-4">
          {desktopCells.map((cell, idx) => {
            
            // กรณีเป็นโหนดจุดหมาย (Milestone)
            if (cell.type === 'milestone') {
              const isSelected = selectedWeek === 'milestone'
              const allDone = monthlyCompletionPct === 100 && monthQuests.length > 0
              const isLocked = isMilestoneLocked
              return (
                <div key="milestone" className="relative bg-[#13131f] rounded-3xl p-1 shadow-sm border border-white/[0.05]">
                  <button
                    disabled={isLocked}
                    onClick={() => {
                      setSelectedWeek('milestone')
                      setIsWeekModalOpen(true)
                    }}
                    className={`w-full p-4 rounded-xl text-left transition-all duration-200 h-full flex flex-col justify-between border cursor-pointer
                      ${isLocked
                        ? 'bg-[#0d0d16]/30 border-white/[0.01] opacity-40 cursor-not-allowed'
                        : isSelected && isWeekModalOpen
                          ? 'bg-amber-500/10 border-amber-500/80 ring-1 ring-amber-500/30'
                          : 'bg-[#13131f] border-white/[0.04] hover:border-amber-500/30'}`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Milestone
                      </span>
                      {isLocked ? (
                        <Lock size={12} className="text-slate-600" />
                      ) : (
                        <Trophy size={18} className={`${allDone ? 'text-amber-400 fill-amber-400/20 animate-bounce' : 'text-slate-600'}`} />
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="text-xs font-bold text-slate-200">บทสรุป & คำชม</p>
                      <p className="text-[9px] text-slate-500 mt-1 leading-snug">
                        {isLocked ? '🔒 ล็อกอยู่' : (allDone ? 'สำเร็จยอดเยี่ยมครบถ้วน!' : 'ประเมินผลเควสรายเดือน')}
                      </p>
                    </div>
                  </button>
                </div>
              )
            }

            // กรณีเป็นโหนดสัปดาห์ (Week Node)
            const w = cell.data
            const isSelected = selectedWeek === cell.weekNum
            const isLocked = isWeekLocked(cell.weekNum)
            const weekRelative = getWeekRelativeState(cell.weekNum)
            const weekBorderOverride = !isLocked
              ? (weekRelative === 'current'
                  ? 'border-amber-400/80 hover:border-amber-400/90'
                  : weekRelative === 'past'
                    ? 'border-white/70'
                    : '')
              : ''
            
            // เลือกสีสันตกแต่งโหนดตามสถานะความเสร็จสมบูรณ์ — Muted Pastel premium styles
            const theme = isLocked 
              ? { border: 'border-white/[0.01] bg-[#0d0d16]/30 opacity-40 cursor-not-allowed', badgeClass: 'bg-[#13131f] text-slate-600 border-white/[0.01]' }
              : {
                  completed:   { border: 'border-emerald-500/20 hover:border-emerald-500/40 bg-[#13131f] cursor-pointer', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                  in_progress: { border: 'border-violet-500/20 hover:border-violet-500/40 bg-[#13131f] cursor-pointer', badgeClass: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
                  pending:     { border: 'border-white/[0.04] hover:border-white/10 bg-[#13131f] cursor-pointer', badgeClass: 'bg-white/5 text-slate-400 border-white/5' },
                  none:        { border: 'border-white/[0.04] hover:border-white/10 bg-[#13131f] cursor-pointer', badgeClass: 'bg-white/5 text-slate-400 border-white/5' }
                }[w.status]

            return (
              <div key={cell.weekNum} className="relative bg-[#13131f] rounded-3xl p-1 shadow-sm border border-white/[0.05]">
                <button
                  disabled={isLocked}
                  onClick={() => {
                    setSelectedWeek(cell.weekNum)
                    setIsWeekModalOpen(true)
                  }}
                  className={`w-full p-4 rounded-xl text-left transition-all duration-200 h-full flex flex-col justify-between border
                    ${isSelected && isWeekModalOpen && !isLocked
                      ? 'bg-violet-600/10 border-violet-500 ring-1 ring-violet-500/30'
                      : `${theme.border} ${weekBorderOverride}`}`}
                >
                  <div className="flex items-start justify-between w-full">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${theme.badgeClass}`}>
                      สัปดาห์ที่ {cell.weekNum}
                    </span>
                    {isLocked ? (
                      <Lock size={12} className="text-slate-600" />
                    ) : w.status === 'completed' ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : w.status === 'in_progress' ? (
                      <Clock size={14} className="text-violet-400 animate-pulse" />
                    ) : null}
                  </div>

                  <div className="mt-3">
                    <p className="text-[10px] text-slate-400 font-semibold">{w.dateRange}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {isLocked ? '🔒 ล็อกอยู่' : (w.status === 'none' ? 'ไม่มีเควส' : `สำเร็จ ${w.done}/${w.total} เควส`)}
                    </p>
                  </div>
                </button>

                {/* ── เวกเตอร์เส้นโค้งประนำทาง (Desktop Dotted Curved S-curve Connectors) ── */}
                {/* เชื่อมสัปดาห์ที่ 1 -> 2 (ซ้ายไปขวา) */}
                {idx === 0 && (
                  <div className="absolute top-1/2 -right-12 w-14 h-14 -translate-y-1/2 overflow-visible hidden md:block z-20 pointer-events-none">
                    <svg className="overflow-visible" width="56" height="56" viewBox="0 0 56 56">
                      <defs>
                        <marker id="arrow-r" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#a78bfa" />
                        </marker>
                      </defs>
                      <path d="M 0 28 Q 14 4, 28 28 T 56 28" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeDasharray="6,4" marker-end="url(#arrow-r)" opacity="0.8" />
                    </svg>
                  </div>
                )}
                {/* เชื่อมสัปดาห์ที่ 2 -> 3 (ซ้ายไปขวา) */}
                {idx === 1 && (
                  <div className="absolute top-1/2 -right-12 w-14 h-14 -translate-y-1/2 overflow-visible hidden md:block z-20 pointer-events-none">
                    <svg className="overflow-visible" width="56" height="56" viewBox="0 0 56 56">
                      <defs>
                        <marker id="arrow-r-2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#a78bfa" />
                        </marker>
                      </defs>
                      <path d="M 0 28 Q 14 4, 28 28 T 56 28" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeDasharray="6,4" marker-end="url(#arrow-r-2)" opacity="0.8" />
                    </svg>
                  </div>
                )}
                {/* ดิ่งเชื่อมต่อสัปดาห์ 3 ลงมายังแถวที่ 2 (บนลงล่าง) */}
                {idx === 2 && (
                  <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-16 h-20 overflow-visible hidden md:block z-20 pointer-events-none">
                    <svg className="overflow-visible" width="64" height="80" viewBox="0 0 64 80">
                      <defs>
                        <marker id="arrow-d" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#a78bfa" />
                        </marker>
                      </defs>
                      <path d="M 32 0 Q 56 20, 32 40 T 32 80" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeDasharray="6,4" marker-end="url(#arrow-d)" opacity="0.8" />
                    </svg>
                  </div>
                )}
                {/* เชื่อมสัปดาห์ที่ 4 -> 5 (ขวาไปซ้าย) */}
                {idx === 5 && (
                  <div className="absolute top-1/2 -left-12 w-14 h-14 -translate-y-1/2 overflow-visible hidden md:block z-20 pointer-events-none">
                    <svg className="overflow-visible" width="56" height="56" viewBox="0 0 56 56">
                      <defs>
                        <marker id="arrow-l" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#a78bfa" />
                        </marker>
                      </defs>
                      <path d="M 56 28 Q 42 4, 28 28 T 0 28" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeDasharray="6,4" marker-end="url(#arrow-l)" opacity="0.8" />
                    </svg>
                  </div>
                )}
                {/* เชื่อมสัปดาห์ที่ 5 -> Milestone (ขวาไปซ้าย) */}
                {idx === 4 && (
                  <div className="absolute top-1/2 -left-12 w-14 h-14 -translate-y-1/2 overflow-visible hidden md:block z-20 pointer-events-none">
                    <svg className="overflow-visible" width="56" height="56" viewBox="0 0 56 56">
                      <defs>
                        <marker id="arrow-l-2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#a78bfa" />
                        </marker>
                      </defs>
                      <path d="M 56 28 Q 42 4, 28 28 T 0 28" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeDasharray="6,4" marker-end="url(#arrow-l-2)" opacity="0.8" />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── 2. เส้นทางแนวตั้งสาหรับหน้าจอ Mobile (ขนาดจอ < md) ── */}
        <div className="block md:hidden space-y-5">
          {weeksData.map((w) => {
            const isSelected = selectedWeek === w.weekNum
            const isLocked = isWeekLocked(w.weekNum)
            const weekRelative = getWeekRelativeState(w.weekNum)
            const weekBorderOverride = !isLocked
              ? (weekRelative === 'current'
                  ? 'border-amber-400/80 hover:border-amber-400/90'
                  : weekRelative === 'past'
                    ? 'border-white/70'
                    : '')
              : ''
            const theme = isLocked
              ? { border: 'border-white/[0.01] bg-[#0d0d16]/30 opacity-40 cursor-not-allowed', badge: 'bg-[#13131f] text-slate-600 border-white/[0.01]' }
              : {
                  completed:   { border: 'border-emerald-500/20 bg-[#13131f]', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                  in_progress: { border: 'border-violet-500/20 bg-[#13131f]', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
                  pending:     { border: 'border-white/[0.04] bg-[#13131f]', badge: 'bg-white/5 text-slate-400 border-white/5' },
                  none:        { border: 'border-white/[0.04] bg-[#13131f]', badge: 'bg-white/5 text-slate-400 border-white/5' }
                }[w.status]

            return (
              <div key={w.weekNum} className="flex flex-col items-center bg-[#13131f] rounded-3xl p-1 shadow-sm border border-white/[0.05]">
                <button
                  disabled={isLocked}
                  onClick={() => {
                    setSelectedWeek(w.weekNum)
                    setIsWeekModalOpen(true)
                  }}
                  className={`w-full p-4 rounded-xl text-left border flex items-center justify-between
                    ${isSelected && isWeekModalOpen && !isLocked ? 'bg-violet-600/10 border-violet-500' : `${theme.border} ${weekBorderOverride}`}`}
                >
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${theme.badge}`}>
                      สัปดาห์ที่ {w.weekNum}
                    </span>
                    <p className="text-[11px] font-bold text-slate-300 mt-2">{w.dateRange}</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-200">
                        {isLocked ? '🔒 ล็อกอยู่' : (w.status === 'none' ? 'ไม่มีเควส' : `${w.done}/${w.total} เควส`)}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{isLocked ? 'ยังไม่เปิด' : 'สำเร็จแล้ว'}</p>
                    </div>
                    {isLocked ? (
                      <Lock size={12} className="text-slate-600 ml-1" />
                    ) : w.status === 'completed' ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : w.status === 'in_progress' ? (
                      <Clock size={14} className="text-violet-400 animate-pulse" />
                    ) : null}
                  </div>
                </button>
                
                {/* เส้นประโค้งนำทางลงมายังสัปดาห์ถัดไปใน Mobile */}
                <div className="w-12 h-14 flex items-center justify-center my-1 pointer-events-none">
                  <svg width="48" height="56" viewBox="0 0 48 56" className="overflow-visible" opacity="0.6">
                    <defs>
                      <marker id="arrow-mob-d" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto">
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#6b7280" />
                      </marker>
                    </defs>
                    <path d="M 24 0 Q 40 14, 24 28 T 24 56" fill="none" stroke="#4b5563" strokeWidth="2" strokeDasharray="5,4" marker-end="url(#arrow-mob-d)" />
                  </svg>
                </div>
              </div>
            )
          })}

          {/* ส่วน Milestone สำหรับ Mobile */}
          <button
            disabled={isMilestoneLocked}
            onClick={() => {
              setSelectedWeek('milestone')
              setIsWeekModalOpen(true)
            }}
            className={`w-full p-4 rounded-xl text-left border flex items-center justify-between cursor-pointer
              ${isMilestoneLocked
                ? 'bg-[#0d0d16]/30 border-white/[0.01] opacity-40 cursor-not-allowed'
                : selectedWeek === 'milestone' && isWeekModalOpen
                  ? 'bg-amber-500/10 border-amber-500' 
                  : 'bg-[#13131f] border-white/[0.04]'}`}
          >
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/10 text-amber-400">
                Milestone
              </span>
              <p className="text-[11px] font-bold text-slate-300 mt-2">
                {isMilestoneLocked ? '🔒 ล็อกอยู่' : 'บทสรุปประจำเดือน'}
              </p>
            </div>
            {isMilestoneLocked ? (
              <Lock size={12} className="text-slate-600" />
            ) : (
              <Trophy size={18} className="text-amber-400 fill-amber-400/20" />
            )}
          </button>
        </div>
      </div>

      {/* ── Modal แสดงรายละเอียดเควสของสัปดาห์ / หรือบทสรุปประจำเดือน — Premium theme ── */}
      {isWeekModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setIsWeekModalOpen(false)}>
          <div className="bg-[#0d0d16] border border-white/[0.06] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] transition-all animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}>
            
            {/* หัวข้อ Modal */}
            <div className="flex justify-between items-center bg-[#10101b] px-5 py-4 border-b border-white/[0.04]">
              {selectedWeek === 'milestone' ? (
                <span className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Trophy size={16} className="fill-amber-400/20" />
                  บทสรุป & คำชมประจำเดือน
                </span>
              ) : (
                <span className="text-sm font-bold text-violet-400 flex items-center gap-2">
                  <Target size={16} />
                  เควสสัปดาห์ที่ {selectedWeek} ({activeDateRange})
                </span>
              )}
              <button onClick={() => setIsWeekModalOpen(false)}
                className="text-slate-500 hover:text-white bg-white/5 p-1 rounded-lg transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* เนื้อหาภายใน Modal */}
            <div className="p-5 overflow-y-auto space-y-4 max-h-[70vh] bg-[#0d0d16]">
              {selectedWeek === 'milestone' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {encouragement.badge}
                    </span>
                    <h4 className="text-xs font-bold text-slate-200">{encouragement.title}</h4>
                  </div>

                  <div className="bg-[#13131f] border border-white/[0.04] p-4 rounded-xl text-xs text-slate-300 leading-relaxed shadow-inner">
                    {encouragement.desc}
                  </div>

                  {/* สรุปตัวเลขผลงานรายเดือน */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#13131f] border border-white/[0.04] p-3 rounded-xl">
                      <p className="text-[10px] text-slate-400">เควสสำเร็จในเดือนนี้</p>
                      <p className="text-sm font-bold text-white mt-1">{completedQuestsCount} / {monthQuests.length} เควส</p>
                    </div>
                    <div className="bg-[#13131f] border border-white/[0.04] p-3 rounded-xl">
                      <p className="text-[10px] text-slate-400">อัตราการผ่านเควส</p>
                      <p className="text-sm font-bold text-emerald-400 mt-1">{monthlyCompletionPct}%</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {activeQuests.length === 0 ? (
                    <div className="text-center py-8">
                      <Zap size={24} className="text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">ไม่มีเควสที่ได้รับมอบหมายในสัปดาห์นี้</p>
                      <p className="text-[10px] text-slate-600 mt-1">พักผ่อนให้เต็มที่นะคนเก่ง! 💤</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {activeQuests.map(tx => (
                        <QuestCard key={tx.id} tx={tx} onSubmit={onSubmitQuest} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

/**
 * ช่วยคำนวณช่วงวันที่ของสัปดาห์นั้นๆ ในเดือนและปีที่ระบุ
 * @param {number} year - ปี ค.ศ.
 * @param {number} month - ลำดับเดือน (0-11)
 * @param {number} weekNum - ลำดับสัปดาห์ (1-5)
 * @returns {string} ข้อความแสดงช่วงวันที่ เช่น "1 - 7 มิ.ย."
 */
function getWeekDateRange(year, month, weekNum) {
  const monthNames = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ]
  const mName = monthNames[month]
  if (weekNum === 1) return `1 - 7 ${mName}`
  if (weekNum === 2) return `8 - 14 ${mName}`
  if (weekNum === 3) return `15 - 21 ${mName}`
  if (weekNum === 4) return `22 - 28 ${mName}`
  const lastDay = new Date(year, month + 1, 0).getDate()
  return `29 - ${lastDay} ${mName}`
}
