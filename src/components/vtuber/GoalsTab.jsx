// src/components/vtuber/GoalsTab.jsx
// ─────────────────────────────────────────────────────────────
// Tab 2: ภาพรวมสถิติความสำเร็จ และ เส้นทางการพัฒนา S-curve
// Contains: StatMini, WeekModal (inline), GoalsTab (default export)
// ─────────────────────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react'
import {
  Trophy, CheckCircle2, Target, Flame,
  ChevronLeft, ChevronRight,
  Clock, X, Banknote, Film, Lock, Zap, Star,
} from 'lucide-react'
import { THAI_MONTHS, toMonthKey } from '../../lib/calendarUtils'
import QuestCard from './QuestCard'

// ══════════════════════════════════════════════════════════════
// 🎨 StatMini — กล่องแสดงตัวเลขสถิติขนาดเล็ก
// ══════════════════════════════════════════════════════════════
/**
 * แสดงกล่องสถิติขนาดเล็กสำหรับหน้า Goals
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {React.ReactNode} props.icon - icon ที่ต้องการแสดงเหนือค่าตัวเลข
 * @param {string|number} props.value - ค่าสถิติที่ต้องการแสดง
 * @param {string} props.label - คำอธิบายของค่าสถิติ
 * @returns {React.ReactElement} กล่องสถิติขนาดเล็กหนึ่งช่อง
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
// 🏆 GoalsTab — ภาพรวมสถิติความสำเร็จ และ เส้นทางการพัฒนา S-curve
// ══════════════════════════════════════════════════════════════
/**
 * แสดงแท็บ Goals ของ VTuber พร้อมสถิติรายเดือน เส้นทาง S-curve และ Modal รายละเอียดเควสรายสัปดาห์
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {Array<Object>} props.quests - รายการเควสทั้งหมดของ VTuber
 * @param {Array<Object>} props.streams - รายการ stream สำหรับคำนวณชั่วโมงสตรีม
 * @param {Array<Object>} props.clips - รายการ clip สำหรับคำนวณจำนวนคลิปสั้น
 * @param {Array<Object>} props.billingRecords - รายการบันทึกรายได้สำหรับคำนวณส่วนแบ่งรายเดือน
 * @param {Date} props.calMonth - เดือนที่กำลังแสดงข้อมูล Goals
 * @param {Function} props.setCalMonth - callback สำหรับเปลี่ยนเดือนที่กำลังแสดง
 * @param {boolean} props.loadingBilling - สถานะกำลังโหลดข้อมูลรายได้
 * @param {Function} props.onSubmitQuest - callback สำหรับส่งเควสไปตรวจ
 * @returns {React.ReactElement} แท็บ Goals พร้อมสถิติและเส้นทางความสำเร็จรายเดือน
 */
export function GoalsTab({
  quests,
  streams,
  clips,
  billingRecords,
  calMonth,
  setCalMonth,
  loadingBilling,
  onSubmitQuest,
}) {
  const [selectedWeek, setSelectedWeek] = useState(1)           // สัปดาห์ที่ผู้ใช้เลือก (1-5 หรือ 'milestone')
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
  /**
   * ตรวจว่าสัปดาห์ที่ระบุควรถูกล็อกเพราะยังเป็นช่วงเวลาในอนาคตหรือไม่
   *
   * @param {number} weekNum - ลำดับสัปดาห์ที่ต้องการตรวจสอบ (1-5)
   * @returns {boolean} true หากสัปดาห์นั้นควรถูกล็อก
   */
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

  /**
   * คืนสถานะเชิงเวลาเทียบกับเดือนและวันปัจจุบันของสัปดาห์ที่ระบุ
   *
   * @param {number} weekNum - ลำดับสัปดาห์ที่ต้องการตรวจสอบ (1-5)
   * @returns {'past'|'current'|'future'} สถานะของสัปดาห์เมื่อเทียบกับวันปัจจุบัน
   */
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
          {/* TODO: Bug Risk - พิจารณา useMemo สำหรับการคำนวณข้อมูล เพราะมี logic theme/lock/status ของแต่ละ node ใน render body */}
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
          {/* TODO: Bug Risk - พิจารณา useMemo สำหรับการคำนวณข้อมูล เพราะมี logic theme/lock/status ของแต่ละสัปดาห์ใน render body */}
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
 * คำนวณข้อความช่วงวันที่ของสัปดาห์ในเดือนและปีที่ระบุ
 *
 * @param {number} year - ปี ค.ศ.
 * @param {number} month - ลำดับเดือนแบบ JavaScript Date (0-11)
 * @param {number} weekNum - ลำดับสัปดาห์ที่ต้องการแสดง (1-5)
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
