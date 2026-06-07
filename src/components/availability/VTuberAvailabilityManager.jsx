import { useState, useEffect, useMemo } from 'react'
import {
  Calendar, CheckCircle2, X, Loader2, Save,
  AlertCircle
} from 'lucide-react'
import Card from '../common/Card'
import { getVTuberAvailability, upsertVTuberAvailability } from '../../lib/supabaseservice'
import { getCalendarDays, THAI_MONTHS } from '../../lib/calendarUtils'
import AvailabilityCalendarGrid from '../calendar/grid/AvailabilityCalendarGrid'
import AvailabilityStats from '../calendar/grid/AvailabilityStats'

/**
 * คอมโพเนนต์จัดการวันว่างสำหรับ VTuber (Self-management)
 * อนุญาตให้ VTuber ดู แก้ไข และบันทึกวันที่ตัวเองว่างในแต่ละเดือน
 * รองรับ 2 โหมด: แบบดู (Read-only) และแบบแก้ไข (Edit Mode)
 * 
 * TODO: Bug Risk - useEffect ที่ดึงข้อมูล Availability ไม่มี active flag / Cleanup function
 * หาก Component unmount ก่อน API ตอบกลับ (เช่น ผู้ใช้เปลี่ยนแท็บเร็ว) 
 * จะเกิด setState หลัง unmount ส่งผลให้เกิด memory leak และ React warning
 * แนวทางแก้: ใช้ `let active = true` ก่อน async call และ `return () => { active = false }` ใน cleanup
 * 
 * TODO: Bug Risk - ฟังก์ชัน handleSave ใช้ setTimeout เพื่อซ่อนข้อความสำเร็จ
 * หาก Component unmount ก่อน timeout หมด จะเกิด memory leak
 * ควรเก็บ timeout ref และ clearTimeout ใน useEffect cleanup
 * 
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {string} props.talentId - User ID (UUID) ของ VTuber ที่เข้าสู่ระบบ
 * @param {Date} props.currentDate - วันที่ปัจจุบันสำหรับใช้คำนวณเดือนและปีที่แสดง
 * @returns {React.ReactElement} การ์ดปฏิทินวันว่างแบบ Interactive สำหรับ VTuber
 */
export default function VTuberAvailabilityManager({ talentId, currentDate }) {
  const [savedDays, setSavedDays] = useState([])
  const [editingDays, setEditingDays] = useState([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  /**
   * โหลดข้อมูลวันว่างของ VTuber จาก Supabase เมื่อ talentId หรือเดือน/ปี เปลี่ยนแปลง
   * พร้อมรีเซ็ต Edit Mode และ editingDays กลับเป็นค่าว่างทุกครั้งที่เดือนเปลี่ยน
   */
  useEffect(() => {
    if (!talentId) return

    const loadAvailability = async () => {
      try {
        setLoading(true)
        setError(null)
        setSuccessMessage(null)
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

  /**
   * คำนวณจำนวนวันทั้งหมดในเดือนปัจจุบัน
   * @type {number}
   */
  const totalDaysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate()
  }, [year, month])

  /**
   * สลับวันที่ในรายการ editingDays (เพิ่มถ้าไม่มี, ลบถ้ามีอยู่แล้ว)
   * ทำงานเฉพาะในโหมด Edit Mode เท่านั้น
   * 
   * @param {number} day - เลขวันที่ที่ต้องการสลับสถานะ (1-31)
   */
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

  /**
   * เข้าสู่โหมดแก้ไข โดยคัดลอกค่าวันว่างที่บันทึกแล้ว (savedDays) มาใส่ใน editingDays
   */
  const handleStartEdit = () => {
    setEditingDays([...savedDays])
    setIsEditMode(true)
    setError(null)
  }

  /**
   * ทำเครื่องหมายทุกวันในเดือนนั้นว่า "ว่าง" ทั้งหมด
   */
  const handleMarkAllAvailable = () => {
    const allDays = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1)
    setEditingDays(allDays)
  }

  /**
   * ล้างวันว่างทั้งหมด (ระบุว่าไม่ว่างทั้งเดือน)
   */
  const handleMarkNoneAvailable = () => {
    setEditingDays([])
  }

  /**
   * ยกเลิกการแก้ไข และกู้คืนข้อมูลกลับเป็นค่าที่บันทึกไว้ก่อนหน้า (savedDays)
   */
  const handleCancel = () => {
    setEditingDays([...savedDays])
    setIsEditMode(false)
    setError(null)
  }

  /**
   * บันทึกวันว่างที่แก้ไขลงฐานข้อมูลผ่าน Supabase UPSERT
   * เรียงลำดับวันที่จากน้อยไปมากก่อนส่งเพื่อให้ฐานข้อมูลเก็บข้อมูลเป็นระเบียบ
   */
  const handleSave = async () => {
    if (!talentId) return
    try {
      setSaving(true)
      setError(null)

      const sortedDays = [...editingDays].sort((a, b) => a - b)

      await upsertVTuberAvailability(talentId, year, month, sortedDays)

      setSavedDays(sortedDays)
      setIsEditMode(false)
      setSuccessMessage('บันทึกวันทำงานสำเร็จ ✓')

      
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

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

  const calendarDays = getCalendarDays(year, month - 1)

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.04]">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Calendar size={16} className="text-emerald-400" />
          วันทำงานประจำเดือน
        </h3>
        <span className="text-[10px] font-bold text-slate-400">
          {THAI_MONTHS[month - 1]} {year}
        </span>
      </div>

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

      <AvailabilityStats
        availableCount={totalAvailable}
        notAvailableCount={totalNotAvailable}
        totalDaysInMonth={totalDaysInMonth}
      />

      <div className="mb-4">
        <AvailabilityCalendarGrid
          calendarDays={calendarDays}
          availableDays={editingDays}
          isEditMode={isEditMode}
          onToggleDay={isEditMode ? handleToggleDay : undefined}
        />
      </div>

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

      {isEditMode && (
        <p className="text-[9px] text-slate-500 mt-3 text-center">
          💡 คลิกวันในปฏิทินเพื่อสลับสถานะ (ว่าง/ไม่ว่าง)
        </p>
      )}
    </Card>
  )
}
