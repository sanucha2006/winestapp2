import { useState, useEffect, useMemo } from 'react'
import { Calendar, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import Card from '../common/Card'
import { getVTuberAvailability } from '../../lib/supabaseservice'
import { getCalendarDays, THAI_MONTHS as MONTHS_ARRAY } from '../../lib/calendarUtils'
import AvailabilityCalendarGrid from '../calendar/grid/AvailabilityCalendarGrid'
import AvailabilityStats from '../calendar/grid/AvailabilityStats'

/**
 * คอมโพเนนต์แสดงวันว่างของ VTuber สำหรับทีมงาน (Read-only Viewer)
 * ทำหน้าที่ดึงและแสดงข้อมูลวันที่ VTuber ระบุว่าว่างในรูปแบบปฏิทินพร้อมสถิติ
 * รองรับระบบ Cache เพื่อลดการ Query ซ้ำซ้อน และมีปุ่มรีเฟรชเพื่อบังคับดึงข้อมูลใหม่
 * 
 * TODO: Bug Risk - useEffect ที่ดึงข้อมูล Availability ไม่มี Cleanup function (active flag) 
 * หาก Component unmount ขณะที่ API call ยังไม่เสร็จ การ setState หลัง unmount 
 * จะทำให้เกิด memory leak และ React warning ใน development mode
 * 
 * TODO: Bug Risk - availabilityCache เป็น dependency ของ useEffect 
 * ซึ่งอาจทำให้ Effect รีรันโดยไม่จำเป็น เมื่อ parent component สร้าง object ใหม่ทุกรอบ render
 * ควรพิจารณาใช้ selector ที่เฉพาะเจาะจงกว่านี้แทน (เช่น availabilityCache?.[selectedTalentId]?.[monthKey])
 * 
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {Array<Object>} [props.talents=[]] - รายชื่อวีทูเบอร์ทั้งหมดสำหรับแสดงใน Dropdown
 * @param {Date} props.currentDate - วันที่ปัจจุบันใช้คำนวณเดือน/ปีที่แสดง
 * @param {Object} props.availabilityCache - แคชวันว่างที่เก็บในระดับ Parent { [talentId]: { [monthKey]: number[] } }
 * @param {Function} props.onCacheUpdate - callback สำหรับอัปเดต cache ในระดับ Parent รับ updater function
 * @returns {React.ReactElement} การ์ดปฏิทินวันว่าง VTuber แบบ Read-only
 */
export default function TeamAvailabilityViewer({
  talents = [],
  currentDate,
  availabilityCache,
  onCacheUpdate,
}) {
  const [selectedTalentId, setSelectedTalentId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1
  const monthKey = `${year}-${month}`

  /**
   * ดึงข้อมูลวันว่างจาก Cache ก่อน ถ้าไม่มีจึง Query จาก Supabase
   * บันทึกผลลัพธ์ลง Cache ผ่าน onCacheUpdate เพื่อใช้ซ้ำในครั้งถัดไป
   */
  useEffect(() => {
    if (!selectedTalentId) return

    const loadAvailability = async () => {
      try {
        setLoading(true)
        setError(null)

        const talentCache = availabilityCache?.[selectedTalentId] || {}

        if (talentCache[monthKey]) {
          return
        }

        const availableDays = await getVTuberAvailability(selectedTalentId, year, month)

        if (onCacheUpdate) {
          onCacheUpdate(prevCache => ({
            ...prevCache,
            [selectedTalentId]: {
              ...talentCache,
              [monthKey]: availableDays,
            },
          }))
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    loadAvailability()
  }, [selectedTalentId, year, month, monthKey, availabilityCache, onCacheUpdate])

  /**
   * ดึงวันว่างของ VTuber ที่เลือกออกจาก Cache
   * @type {number[]}
   */
  const availableDays = useMemo(() => {
    if (!selectedTalentId || !availabilityCache) return []
    const talentCache = availabilityCache[selectedTalentId]
    return talentCache?.[monthKey] || []
  }, [selectedTalentId, monthKey, availabilityCache])

  /**
   * ค้นหาข้อมูล VTuber ที่ถูกเลือกจากรายชื่อทั้งหมด
   * @type {Object|undefined}
   */
  const selectedTalent = useMemo(() => {
    return talents.find(t => t.user_id === selectedTalentId)
  }, [selectedTalentId, talents])

  /**
   * บังคับดึงข้อมูลใหม่จาก Supabase โดยล้าง Cache ของ VTuber/เดือนนั้นก่อน
   * 
   * TODO: Bug Risk - ฟังก์ชันนี้ไม่มีการป้องกัน Race Condition 
   * หากผู้ใช้กดรีเฟรชซ้ำเร็ว ๆ จะเกิด API call ทับกัน และ state อาจถูกเขียนทับด้วยผลลัพธ์ที่ล้าสมัย
   * ควรเพิ่ม debounce หรือใช้ AbortController
   */
  const handleForceRefresh = async () => {
    if (!selectedTalentId) return
    try {
      setLoading(true)
      setError(null)

      if (onCacheUpdate) {
        onCacheUpdate(prevCache => {
          const newCache = { ...prevCache }
          if (newCache[selectedTalentId]) {
            const talentCache = { ...newCache[selectedTalentId] }
            delete talentCache[monthKey]
            if (Object.keys(talentCache).length > 0) {
              newCache[selectedTalentId] = talentCache
            } else {
              delete newCache[selectedTalentId]
            }
          }
          return newCache
        })
      }

      const freshDays = await getVTuberAvailability(selectedTalentId, year, month)

      if (onCacheUpdate) {
        onCacheUpdate(prevCache => ({
          ...prevCache,
          [selectedTalentId]: {
            ...prevCache[selectedTalentId],
            [monthKey]: freshDays,
          },
        }))
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedTalentId) {
    return (
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Calendar size={16} className="text-emerald-400" />
            วันทำงาน VTuber
          </h3>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
            เลือก VTuber
          </label>
          <select
            value={selectedTalentId || ''}
            onChange={(e) => setSelectedTalentId(e.target.value || null)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
          >
            <option value="">-- เลือก VTuber --</option>
            {talents.map(talent => (
              <option key={talent.id} value={talent.user_id ?? ''} disabled={!talent.user_id}>
                {talent.talent_name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500 text-center mt-6 py-6">
          ⬇️ โปรดเลือก VTuber เพื่อดูวันว่าง
        </p>
      </Card>
    )
  }

  if (loading && availableDays.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-xs">กำลังโหลดข้อมูล...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/25">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-red-400 font-semibold">เกิดข้อผิดพลาด</p>
            <p className="text-[10px] text-red-300 mt-1">{error}</p>
          </div>
        </div>
      </Card>
    )
  }

  const calendarDays = getCalendarDays(year, month - 1)
  const totalDaysInMonth = new Date(year, month, 0).getDate()
  const availableCount = availableDays.length
  const notAvailableCount = totalDaysInMonth - availableCount

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.04]">
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-emerald-400" />
            วันทำงาน {selectedTalent?.talent_name}
          </h3>
          <p className="text-[9px] text-slate-500">
            {MONTHS_ARRAY[month - 1]} {year}
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedTalentId || ''}
            onChange={(e) => setSelectedTalentId(e.target.value || null)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-200 text-[11px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
          >
            <option value="">-- เลือก --</option>
            {talents.map(talent => (
              <option key={talent.id} value={talent.user_id ?? ''} disabled={!talent.user_id}>
                {talent.talent_name}
              </option>
            ))}
          </select>

          <button
            onClick={handleForceRefresh}
            disabled={loading}
            title="รีเฟรชข้อมูล (ล้าง cache และดึงใหม่)"
            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/50 hover:bg-indigo-600 text-indigo-300 text-[11px] font-bold transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'รีเฟรช...' : 'รีเฟรช'}
          </button>
        </div>
      </div>

      <AvailabilityStats
        availableCount={availableCount}
        notAvailableCount={notAvailableCount}
        totalDaysInMonth={totalDaysInMonth}
      />

      <AvailabilityCalendarGrid
        calendarDays={calendarDays}
        availableDays={availableDays}
      />

      <p className="text-[9px] text-slate-600 mt-3 text-center">
        💾 ข้อมูลถูกเก็บใน cache เพื่อลดการ query • กดรีเฟรชเพื่อดึงใหม่
      </p>
    </Card>
  )
}
