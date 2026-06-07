import { CheckCircle, X, Loader2 } from 'lucide-react'
import { useState } from 'react'

/**
 * แสดง Modal สำหรับสรุปและบันทึกการจบไลฟ์ของ Stream Event
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {Object} props.stream - ข้อมูล Stream Event ที่ต้องการจบไลฟ์
 * @param {string} props.defaultEndTime - เวลาจบไลฟ์ตั้งต้น รูปแบบ HH:MM
 * @param {number} [props.defaultRevenue=0] - รายได้ตั้งต้นของไลฟ์
 * @param {Function} props.onSubmit - callback สำหรับบันทึกข้อมูลจบไลฟ์
 * @param {Function} props.onClose - callback สำหรับปิด Modal
 * @returns {React.ReactElement} Modal ฟอร์มสรุปจบไลฟ์
 */
export default function EndStreamModal({ stream, defaultEndTime, defaultRevenue = 0, onSubmit, onClose }) {
  
  const [endTime, setEndTime] = useState(defaultEndTime)
  const [revenue, setRevenue] = useState(defaultRevenue)
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * Submit ข้อมูลเวลาจบไลฟ์และรายได้เพื่ออัปเดต Stream Event
   *
   * @param {React.FormEvent<HTMLFormElement>} event - submit event จากฟอร์ม
   * @returns {Promise<void>} Promise ที่ resolve เมื่อ onSubmit ทำงานเสร็จ
   */
  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return
    
    setIsSubmitting(true)
    try {
      await onSubmit({
        endTime,
        revenue: Math.max(0, Number(revenue) || 0),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="bg-[#15151f] border border-emerald-500/25 rounded-2xl w-full max-w-md shadow-2xl shadow-emerald-950/30 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-700/60 flex justify-between items-center bg-[#1a1a28]">
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <CheckCircle size={15} className="text-emerald-400" />
              สรุปจบไลฟ์
            </h3>
            <p className="text-[11px] text-slate-500 truncate mt-1">{stream.title}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-[#15151f]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 font-medium mb-1.5 block">เวลาจบไลฟ์</label>
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$"
                maxLength={5}
                value={endTime}
                onChange={event => setEndTime(event.target.value)}
                className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                placeholder="23:30"
                title="กรอกเวลาแบบ 24 ชั่วโมง เช่น 23:30"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium mb-1.5 block">รายได้สตรีม (บาท)</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={revenue}
                onChange={event => setRevenue(event.target.value)}
                className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors disabled:opacity-50">
              ยกเลิก
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-950/40 flex items-center gap-1.5 disabled:opacity-50">
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกจบไลฟ์'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
