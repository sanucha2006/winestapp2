// src/components/availability/VTuberAvailabilityManager.jsx
// ─────────────────────────────────────────────────────────────
// Component สำหรับให้ VTuber ลงวันว่างของตัวเองในหน้า VTuberDashboard
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import {
  Calendar, CheckCircle2, X, Loader2, Save,
  AlertCircle
} from 'lucide-react'
import Card from '../common/Card'
import { getVTuberAvailability, upsertVTuberAvailability } from '../../lib/supabaseservice'
import { getCalendarDays, THAI_MONTHS } from '../../lib/calendarUtils'

export default function VTuberAvailabilityManager({ talentId, currentDate }) {
  // ── State หลัก ──
  const [savedDays, setSavedDays] = useState([])
  const [editingDays, setEditingDays] = useState([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1 // 1-12

  // ── โหลดข้อมูลวันว่างเมื่อ talentId หรือเดือน/ปี เปลี่ยน ──
  useEffect(() => {
    if (!talentId) return

    const loadAvailability = async () => {
      try {
        setLoading(true)
        setError(null)
        setSuccessMessage(null)
        // ✨ ออกจาก Edit Mode และล้างค่า editingDays เมื่อเปลี่ยนเดือน
        setIsEditMode(false)
        setEditingDays([])

        const days = await getVTuberAvailability(talentId, year, month)
        setSavedDays(days || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    loadAvailability()
  }, [talentId, year, month])

  // ── จำนวนวันในเดือน ──
  const totalDaysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate()
  }, [year, month])

  // ── Click วัน: สลับเข้า/ออกจาก editingDays ──
  const handleToggleDay = (day) => {
    if (!isEditMode) return
    setEditingDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day)
      } else {
        return [...prev, day]
      }
    })
  }

  // ── ปุ่มเริ่มแก้ไข: คัดลอก savedDays → editingDays ──
  const handleStartEdit = () => {
    setEditingDays([...savedDays])
    setIsEditMode(true)
    setError(null)
  }

  // ── ปุ่ม "ว่างทุกวัน" ──
  const handleMarkAllAvailable = () => {
    const allDays = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1)
    setEditingDays(allDays)
  }

  // ── ปุ่ม "ไม่ว่างเลย" ──
  const handleMarkNoneAvailable = () => {
    setEditingDays([])
  }

  // ── ปุ่มยกเลิก ──
  const handleCancel = () => {
    setEditingDays([...savedDays])
    setIsEditMode(false)
    setError(null)
  }

  // ── ปุ่มบันทึก ──
  const handleSave = async () => {
    if (!talentId) return
    try {
      setSaving(true)
      setError(null)

      // จัดเรียงตัวเลขจากน้อยไปมาก
      const sortedDays = [...editingDays].sort((a, b) => a - b)

      // บันทึกลงฐานข้อมูล (UPSERT)
      await upsertVTuberAvailability(talentId, year, month, sortedDays)

      // ย้ายค่าไป savedDays และออกจาก edit mode
      setSavedDays(sortedDays)
      setIsEditMode(false)
      setSuccessMessage('บันทึกวันทำงานสำเร็จ ✓')

      // ซ่อนข้อความสำเร็จหลังจาก 3 วินาที
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── คำนวณสถิติ ──
  const totalAvailable = editingDays.length
  const totalNotAvailable = totalDaysInMonth - totalAvailable

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-xs">กำลังโหลดข้อมูล...</span>
        </div>
      </Card>
    )
  }

  const calendarDays = getCalendarDays(year, month - 1) // month index 0-11

  return (
    <Card className="p-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.04]">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Calendar size={16} className="text-emerald-400" />
          วันทำงานประจำเดือน
        </h3>
        <span className="text-[10px] font-bold text-slate-400">
          {THAI_MONTHS[month - 1]} {year}
        </span>
      </div>

      {/* ── ข้อความสำเร็จ/ข้อผิดพลาด ── */}
      {successMessage && (
        <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2">
          <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
          <p className="text-[11px] text-emerald-300 font-semibold">{successMessage}</p>
        </div>
      )}
      {error && (
        <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center gap-2">
          <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
          <p className="text-[11px] text-red-300 font-semibold">{error}</p>
        </div>
      )}

      {/* ── สถิติ ── */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-3">
          <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">ว่าง</p>
          <p className="text-xl font-bold text-emerald-300 mt-1">{totalAvailable}</p>
          <p className="text-[9px] text-slate-500 mt-0.5">วัน</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/25 rounded-lg p-3">
          <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider">ไม่ว่าง</p>
          <p className="text-xl font-bold text-red-300 mt-1">{totalNotAvailable}</p>
          <p className="text-[9px] text-slate-500 mt-0.5">วัน</p>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-lg p-3">
          <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">ทั้งหมด</p>
          <p className="text-xl font-bold text-indigo-300 mt-1">{totalDaysInMonth}</p>
          <p className="text-[9px] text-slate-500 mt-0.5">วัน</p>
        </div>
      </div>

      {/* ── ปฏิทิน ── */}
      <div className="bg-[#0f0f17] rounded-lg border border-white/[0.05] p-3 mb-4">
        {/* Header วันในสัปดาห์ */}
        <div className="grid grid-cols-7 mb-2 gap-0.5">
          {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map(day => (
            <div key={day} className="text-center text-[9px] font-bold text-slate-500 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Grid วันต่างๆ */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day, index) => {
            if (!day) return <div key={`blank-${index}`} className="bg-transparent aspect-square" />

            const isAvailable = editingDays.includes(day)

            return (
              <button
                key={day}
                type="button"
                disabled={!isEditMode}
                onClick={() => handleToggleDay(day)}
                className={`aspect-square flex items-center justify-center rounded-lg border text-xs font-bold transition-all
                  ${isAvailable
                    ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-400 ring-1 ring-emerald-500/20'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                  }
                  ${isEditMode
                    ? 'cursor-pointer hover:brightness-110'
                    : 'cursor-not-allowed opacity-60'
                  }`}
              >
                {day}
                {isAvailable && isEditMode && (
                  <div className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Buttons ── */}
      <div className="space-y-2">
        {!isEditMode ? (
          <button
            onClick={handleStartEdit}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-lg"
          >
            <Calendar size={13} />
            เพิ่ม/แก้ไขวันทำงาน
          </button>
        ) : (
          <>
            {/* ปุ่มด้านบนในโหมด Edit */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleMarkAllAvailable}
                className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-indigo-600/70 hover:bg-indigo-600 text-white text-[11px] font-bold transition-colors"
              >
                <CheckCircle2 size={12} />
                ว่างทุกวัน
              </button>
              <button
                onClick={handleMarkNoneAvailable}
                className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-slate-600/70 hover:bg-slate-600 text-white text-[11px] font-bold transition-colors"
              >
                <X size={12} />
                ไม่ว่างเลย
              </button>
            </div>

            {/* ปุ่มด้านล่างในโหมด Edit */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? 'บันทึก...' : 'บันทึก'}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold transition-colors"
              >
                <X size={12} />
                ยกเลิก
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── หมายเหตุ ── */}
      {isEditMode && (
        <p className="text-[9px] text-slate-500 mt-3 text-center">
          💡 คลิกวันในปฏิทินเพื่อสลับสถานะ (ว่าง/ไม่ว่าง)
        </p>
      )}
    </Card>
  )
}
