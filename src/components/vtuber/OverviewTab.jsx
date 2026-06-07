// src/components/vtuber/OverviewTab.jsx
// ─────────────────────────────────────────────────────────────
// Tab 1: ภาพรวมปฏิทิน และ รายการเควสประจำเดือน
// ─────────────────────────────────────────────────────────────
import { useMemo } from 'react'
import { Target } from 'lucide-react'
import MasterCalendar from '../calendar/MasterCalendar'
import Skeleton from '../common/Skeleton'
import QuestCard, { FREQ_CONFIG } from './QuestCard'

/**
 * แสดงแท็บ Overview ของ VTuber พร้อมปฏิทิน ตารางวันว่าง และรายการเควสประจำเดือน
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {Object|null} props.talent - ข้อมูล VTuber ปัจจุบัน
 * @param {Array<Object>} props.streams - รายการ stream สำหรับแสดงในปฏิทิน
 * @param {Array<Object>} props.clips - รายการ clip สำหรับแสดงในปฏิทิน
 * @param {Array<Object>} props.quests - รายการเควสของ VTuber ในเดือนที่เลือก
 * @param {Date} props.calMonth - เดือนที่กำลังแสดงในปฏิทิน
 * @param {Function} props.setCalMonth - callback สำหรับเปลี่ยนเดือนของปฏิทิน
 * @param {boolean} props.loadingCalendar - สถานะโหลดข้อมูลปฏิทิน
 * @param {boolean} props.loadingQuests - สถานะโหลดข้อมูลเควส
 * @param {Function} props.onSubmitQuest - callback สำหรับส่งเควสไปตรวจ
 * @param {number[]} props.availableDays - รายการเลขวันที่ที่ VTuber ว่าง
 * @param {boolean} props.isEditMode - ระบุว่าอยู่ในโหมดแก้ไขวันว่างหรือไม่
 * @param {Function} props.onToggleDay - callback เมื่อคลิกสลับสถานะวันว่าง
 * @param {Function} props.onStartEdit - callback สำหรับเริ่มโหมดแก้ไขวันว่าง
 * @param {Function} props.onSave - callback สำหรับบันทึกวันว่าง
 * @param {Function} props.onCancel - callback สำหรับยกเลิกการแก้ไขวันว่าง
 * @param {Function} props.onMarkAll - callback สำหรับเลือกวันว่างทั้งหมด
 * @param {Function} props.onMarkNone - callback สำหรับล้างวันว่างทั้งหมด
 * @param {boolean} props.savingAvailability - สถานะกำลังบันทึกข้อมูลวันว่าง
 * @param {boolean} props.loadingAvailability - สถานะโหลดข้อมูลวันว่าง
 * @returns {React.ReactElement} แท็บ Overview ที่รวมปฏิทินและรายการเควสของ VTuber
 */
export default function OverviewTab({
  talent,
  streams,
  clips,
  quests,
  calMonth,
  setCalMonth,
  loadingCalendar,
  loadingQuests,
  onSubmitQuest,
  availableDays,
  isEditMode,
  onToggleDay,
  onStartEdit,
  onSave,
  onCancel,
  onMarkAll,
  onMarkNone,
  savingAvailability,
  loadingAvailability,
}) {
  
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

        <div className="lg:col-span-3 space-y-5">
          <MasterCalendar
            role="vtuber"
            userId={talent?.user_id}
            currentDate={calMonth}
            onMonthChange={setCalMonth}
            streams={streams}
            clips={clips}
            loading={loadingCalendar || loadingAvailability}
            permissions={{
              canCreate: false,
              canEditStatus: false,
              canDelete: false,
              canEndStream: false,
              canViewFinancials: false,
              canFilterAllTalents: false,
            }}
            availableDays={availableDays}
            isEditMode={isEditMode}
            onToggleDay={onToggleDay}
            onStartEdit={onStartEdit}
            onSave={onSave}
            onCancel={onCancel}
            onMarkAll={onMarkAll}
            onMarkNone={onMarkNone}
            savingAvailability={savingAvailability}
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
