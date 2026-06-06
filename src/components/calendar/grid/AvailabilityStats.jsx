// src/components/calendar/AvailabilityStats.jsx
// ─────────────────────────────────────────────────────────────
// Shared UI: 3-box stats row (ว่าง / ไม่ว่าง / ทั้งหมด)
// Used by: TeamAvailabilityViewer, VTuberAvailabilityManager
// ─────────────────────────────────────────────────────────────

/**
 * แสดงสรุปจำนวนวันว่าง ไม่ว่าง และจำนวนวันทั้งหมดในเดือน
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {number} props.availableCount - จำนวนวันที่ VTuber ว่าง
 * @param {number} props.notAvailableCount - จำนวนวันที่ VTuber ไม่ว่าง
 * @param {number} props.totalDaysInMonth - จำนวนวันทั้งหมดของเดือนที่กำลังแสดง
 * @returns {React.ReactElement} แถวสถิติ 3 ช่องสำหรับสรุปวันว่างของเดือน
 */
export default function AvailabilityStats({ availableCount, notAvailableCount, totalDaysInMonth }) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-3">
        <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">ว่าง</p>
        <p className="text-xl font-bold text-emerald-300 mt-1">{availableCount}</p>
        <p className="text-[9px] text-slate-500 mt-0.5">วัน</p>
      </div>
      <div className="bg-red-500/10 border border-red-500/25 rounded-lg p-3">
        <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider">ไม่ว่าง</p>
        <p className="text-xl font-bold text-red-300 mt-1">{notAvailableCount}</p>
        <p className="text-[9px] text-slate-500 mt-0.5">วัน</p>
      </div>
      <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-lg p-3">
        <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">ทั้งหมด</p>
        <p className="text-xl font-bold text-indigo-300 mt-1">{totalDaysInMonth}</p>
        <p className="text-[9px] text-slate-500 mt-0.5">วัน</p>
      </div>
    </div>
  )
}
