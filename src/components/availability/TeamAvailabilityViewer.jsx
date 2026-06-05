// src/components/availability/TeamAvailabilityViewer.jsx
// ─────────────────────────────────────────────────────────────
// Component สำหรับให้ทีมดูวันว่างของ VTuber โดยมีระบบ Cache
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import {
  Calendar, Loader2, RefreshCw, AlertCircle
} from 'lucide-react'
import Card from '../common/Card'
import { getVTuberAvailability } from '../../lib/supabaseservice'
import { getCalendarDays, THAI_MONTHS as MONTHS_ARRAY } from '../../lib/calendarUtils'

export default function TeamAvailabilityViewer({
  talents = [],
  currentDate,
  availabilityCache,
  onCacheUpdate,
}) {
  // ── State ──
  const [selectedTalentId, setSelectedTalentId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1
  const monthKey = `${year}-${month}` // "2026-6" format

  // ── ดึงข้อมูลวันว่างจาก cache หรือ API ──
  useEffect(() => {
    if (!selectedTalentId) return

    const loadAvailability = async () => {
      try {
        setLoading(true)
        setError(null)

        // ── ตรวจสอบใน cache ก่อน ──
        const talentCache = availabilityCache?.[selectedTalentId] || {}

        if (talentCache[monthKey]) {
          // ✨ มีใน cache แล้ว ไม่ต้อง query
          return
        }

        // ── ไม่มี cache → query API ──
        const availableDays = await getVTuberAvailability(selectedTalentId, year, month)

        // ── บันทึกลง cache (merge กับ cache เก่า) ──
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

  // ── ดึงข้อมูล available days จาก cache ──
  const availableDays = useMemo(() => {
    if (!selectedTalentId || !availabilityCache) return []
    const talentCache = availabilityCache[selectedTalentId]
    return talentCache?.[monthKey] || []
  }, [selectedTalentId, monthKey, availabilityCache])

  // ── ดึงชื่อ VTuber ที่เลือก ──
  const selectedTalent = useMemo(() => {
    return talents.find(t => t.user_id === selectedTalentId)
  }, [selectedTalentId, talents])

  // ── ปุ่มรีเฟรช: ล้าง cache สำหรับ VTuber/เดือน นี้ ──
  const handleForceRefresh = async () => {
    if (!selectedTalentId) return
    try {
      setLoading(true)
      setError(null)

      // ล้าง cache entry สำหรับ VTuber/เดือน นี้
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

      // Query ใหม่
      const availableDays = await getVTuberAvailability(selectedTalentId, year, month)

      // บันทึก cache ใหม่
      if (onCacheUpdate) {
        onCacheUpdate(prevCache => ({
          ...prevCache,
          [selectedTalentId]: {
            ...prevCache[selectedTalentId],
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
      {/* ── Header ─ */}
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

        {/* ── Dropdown + Refresh ──*/}
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

      {/* ── สถิติ ── */}
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

      {/* ── ปฏิทิน (read-only) ── */}
      <div className="bg-[#0f0f17] rounded-lg border border-white/[0.05] p-3">
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

            const isAvailable = availableDays.includes(day)

            return (
              <div
                key={day}
                className={`aspect-square flex items-center justify-center rounded-lg border text-xs font-bold transition-all
                  ${isAvailable
                    ? 'bg-emerald-500/20 border-emerald-400/60 text-white ring-1 ring-emerald-500/20'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                  }
                  cursor-default`}
              >
                {day}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── หมายเหตุ cache ── */}
      <p className="text-[9px] text-slate-600 mt-3 text-center">
        💾 ข้อมูลถูกเก็บใน cache เพื่อลดการ query • กดรีเฟรชเพื่อดึงใหม่
      </p>
    </Card>
  )
}
