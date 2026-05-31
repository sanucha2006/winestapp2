import React, { useState, useMemo } from 'react'
import {
  LayoutDashboard, Trophy, Calendar,
  CheckCircle2, Circle, Star, Lock,
  PlayCircle, Tv2, Smartphone, Flame, ChevronLeft, ChevronRight
} from 'lucide-react'

// ─────────────────────────────────────────────
// ฐานข้อมูลจำลอง (Mock Data) - อนาคตจะถูกดึงมาจากหน้า Team
// ─────────────────────────────────────────────
const INITIAL_STREAMS = [
  { id: 1, title: 'Minecraft Survival S3 EP.12', date: '2026-06-01', time: '20:00', platform: 'YouTube', status: 'Planned' },
  { id: 2, title: 'ร้องเพลง Karaoke Night!', date: '2026-06-03', time: '21:00', platform: 'YouTube', status: 'Planned' },
  { id: 3, title: 'Elden Ring Challenge Run', date: '2026-05-28', time: '19:00', platform: 'Twitch', status: 'Done' },
]

const INITIAL_SHORTS = [
  { id: 1, idea: 'Highlights — Epic Minecraft Fail', date: '2026-05-29', status: 'Review' },
  { id: 2, idea: 'Vtuber Lore Intro (30s)', date: '2026-05-31', status: 'Editing' },
]

const INITIAL_QUESTS = [
  { id: 1, title: 'เตรียมฉากและเปิดระบบสตรีมประจำวัน', done: true },
  { id: 2, title: 'อัปเดตตารางงานแชร์ลง Discord สังกัด', done: false },
  { id: 3, title: 'ส่งไอเดียทำคลิปสั้นประจำสัปดาห์นี้', done: false },
]

// ============================================================================
// 🟪 ส่วนที่ 1: ส่วนหัวสำหรับเปลี่ยน Tab (เหลือแค่ 2 หน้า)
// ============================================================================
const NAVIGATION_ITEMS = [
  { id: 'overview', label: 'ภาพรวมตารางงาน', icon: LayoutDashboard },
  { id: 'goals',    label: 'เป้าหมาย & สถิติ', icon: Trophy },
]

export default function VTuberDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  // ข้อมูลเหล่านี้ฝั่ง VTuber จะทำได้แค่ "อ่าน" เท่านั้น
  const [streams] = useState(INITIAL_STREAMS)
  const [shorts] = useState(INITIAL_SHORTS)
  const [quests] = useState(INITIAL_QUESTS)

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-200 antialiased font-sans select-none pb-12">
      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Navbar */}
        <div className="flex bg-[#12121a] border border-white/[0.04] rounded-xl p-1 shadow-md">
          {NAVIGATION_ITEMS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 flex-1 justify-center
                  ${isActive ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'}`}
              >
                <Icon size={14} className="shrink-0" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* จุดแสดงผล */}
        <div className="focus:outline-none">
          {activeTab === 'overview' && <OverviewTab streams={streams} shorts={shorts} quests={quests} />}
          {activeTab === 'goals'    && <GoalsTab />}
        </div>

      </div>
    </div>
  )
}

// ============================================================================
// 🟦 ส่วนที่ 2: โค้ดหน้าภาพรวมปฏิทินและเควส (Read-Only)
// ============================================================================
function OverviewTab({ streams, shorts, quests }) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 31))
  const [selectedDate, setSelectedDate] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const totalDays = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month])
  const firstDayIndex = useMemo(() => new Date(year, month, 1).getDay(), [year, month])
  const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

  const calendarDays = useMemo(() => {
    return [...Array(firstDayIndex).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)]
  }, [firstDayIndex, totalDays])

  const activeDayTasks = useMemo(() => {
    if (!selectedDate) return null
    return {
      streams: streams.filter(s => s.date === selectedDate),
      shorts: shorts.filter(s => s.date === selectedDate)
    }
  }, [selectedDate, streams, shorts])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ฝั่งซ้าย: ปฏิทิน */}
      <div className="lg:col-span-2 bg-[#12121a] border border-white/[0.04] rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Calendar size={16} className="text-purple-400" /> ตารางคิวงาน (กำหนดโดยทีมงาน)
          </div>
          <div className="flex items-center gap-2 bg-[#191924] px-3 py-1 rounded-xl border border-white/[0.04]">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="text-slate-400 hover:text-white p-0.5"><ChevronLeft size={16} /></button>
            <span className="text-xs font-bold text-slate-300 min-w-[100px] text-center">{THAI_MONTHS[month]} {year}</span>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="text-slate-400 hover:text-white p-0.5"><ChevronRight size={16} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500 py-1.5 mb-2 bg-[#181822] rounded-lg">
          <div>อา.</div><div>จ.</div><div>อ.</div><div>พ.</div><div>พฤ.</div><div>ศ.</div><div>ส.</div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((day, idx) => {
            if (!day) return <div key={`b-${idx}`} className="opacity-0" />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const hasStream = streams.some(s => s.date === dateStr)
            const hasShort = shorts.some(s => s.date === dateStr)
            const isToday = year === 2026 && month === 4 && day === 31

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`min-h-[50px] p-1.5 rounded-xl border flex flex-col justify-between text-left transition-all group
                  ${isToday ? 'bg-purple-600/10 border-purple-500/40 text-purple-400' : 'bg-[#161622] border-white/[0.03] text-slate-400 hover:border-slate-700'}`}
              >
                <span className="text-xs font-bold">{day}</span>
                <div className="flex gap-1 mt-1">
                  {hasStream && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                  {hasShort && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ฝั่งขวา: เควสและรายการงาน */}
      <div className="space-y-4">
        <div className="bg-[#12121a] border border-white/[0.04] rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Flame size={14} className="text-amber-400" /> เควสประจำวัน
          </h3>
          <div className="space-y-2">
            {quests.map(q => (
              // ลบ onClick และ cursor-pointer ออก เพราะทำได้แค่ดู
              <div key={q.id} className="flex items-center gap-3 p-3 bg-[#161622] rounded-xl border border-white/[0.02]">
                {q.done ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> : <Circle size={16} className="text-slate-600 shrink-0" />}
                <span className={`text-xs font-medium ${q.done ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{q.title}</span>
              </div>
            ))}
          </div>
        </div>

        {selectedDate && (
          <div className="bg-[#12121a] border border-purple-500/20 rounded-2xl p-4 shadow-lg">
            <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
              <span className="text-xs font-bold text-purple-400">📅 งานในวันที่: {selectedDate.split('-').reverse().join('/')}</span>
              <button onClick={() => setSelectedDate(null)} className="text-slate-500 hover:text-white text-xs">ปิด</button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {activeDayTasks?.streams.map(s => (
                <div key={s.id} className="text-xs p-2 bg-purple-500/5 rounded-lg border border-purple-500/10 flex items-center justify-between">
                  <span className="text-slate-200 truncate">🎥 {s.time} | {s.title}</span>
                </div>
              ))}
              {activeDayTasks?.shorts.map(s => (
                <div key={s.id} className="text-xs p-2 bg-cyan-500/5 rounded-lg border border-cyan-500/10 flex items-center justify-between">
                  <span className="text-slate-200 truncate">🎬 {s.idea}</span>
                </div>
              ))}
              {activeDayTasks?.streams.length === 0 && activeDayTasks?.shorts.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-500">ไม่มีคิวงานตั้งไว้ในวันนี้</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// 🟨 ส่วนที่ 3: โค้ดหน้าเป้าหมายและสถิติ (คงเดิม)
// ============================================================================
function GoalsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-[#12121a] border border-white/[0.04] rounded-2xl p-6 space-y-5 shadow-md">
        <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
          <Trophy size={15} className="text-amber-400" />
          <span>เป้าหมายการเติบโตประจำเดือน — มิถุนายน 2026</span>
        </h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-medium text-slate-400">
              <span className="flex items-center gap-1.5">🎮 ชั่วโมงสตรีมรวม (Live Stream Hours)</span>
              <span className="font-bold text-slate-200">14 / 20</span>
            </div>
            <div className="h-2 bg-black/30 rounded-full overflow-hidden border border-white/[0.02]">
              <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full" style={{ width: '70%' }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-medium text-slate-400">
              <span className="flex items-center gap-1.5">🎬 จำนวน Shorts ที่ปล่อย (Shorts Created)</span>
              <span className="font-bold text-slate-200">6 / 8</span>
            </div>
            <div className="h-2 bg-black/30 rounded-full overflow-hidden border border-white/[0.02]">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '75%' }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-medium text-slate-400">
              <span className="flex items-center gap-1.5">👥 ยอดผู้ติดตาม (Target Subscribers)</span>
              <span className="font-bold text-slate-200">46,050 / 50,000</span>
            </div>
            <div className="h-2 bg-black/30 rounded-full overflow-hidden border border-white/[0.02]">
              <div className="h-full bg-sky-500 rounded-full" style={{ width: '92.1%' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Star size={13} className="text-amber-400" /> สถิติรวมของช่อง (ALL-TIME STATS)
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#12121a]/60 border border-white/[0.03] rounded-xl p-4 text-center space-y-1">
            <span className="text-lg">🎮</span>
            <div className="text-xl font-black text-purple-400">47</div>
            <div className="text-[10px] font-medium text-slate-500">สตรีมสำเร็จรวม</div>
          </div>
          <div className="bg-[#12121a]/60 border border-white/[0.03] rounded-xl p-4 text-center space-y-1">
            <span className="text-lg">⏱️</span>
            <div className="text-xl font-black text-cyan-400">178</div>
            <div className="text-[10px] font-medium text-slate-500">ชั่วโมงสตรีมรวม</div>
          </div>
          <div className="bg-[#12121a]/60 border border-white/[0.03] rounded-xl p-4 text-center space-y-1">
            <span className="text-lg">🎬</span>
            <div className="text-xl font-black text-pink-400">30</div>
            <div className="text-[10px] font-medium text-slate-500">Shorts ผลิตรวม</div>
          </div>
          <div className="bg-[#12121a]/60 border border-white/[0.03] rounded-xl p-4 text-center space-y-1">
            <span className="text-lg">⭐</span>
            <div className="text-xl font-black text-amber-400">11,950</div>
            <div className="text-[10px] font-medium text-slate-500">คะแนน XP สะสม</div>
          </div>
        </div>
      </div>

      <div className="bg-[#12121a]/40 border border-white/[0.02] rounded-xl p-4 flex items-center justify-between opacity-80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-400 shrink-0">
            <Lock size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-400">Locked Monthly Goal</p>
            <p className="text-[11px] text-slate-500 truncate">🎬 สัญญาเสตรีมเมอร์: ส่งรายงานและผลิตคลิปสั้นครบ 8 คลิปภายในหนึ่งรอบปฏิทินสำเร็จ!</p>
          </div>
        </div>
        <Lock size={14} className="text-slate-600 shrink-0 ml-2" />
      </div>
    </div>
  )
}