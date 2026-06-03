import { CheckCircle, X } from 'lucide-react'
import { useState } from 'react'

export default function EndStreamModal({ stream, defaultEndTime, defaultRevenue = 0, onSubmit, onClose }) {
  const [endTime, setEndTime] = useState(defaultEndTime)
  const [revenue, setRevenue] = useState(defaultRevenue)

  const handleSubmit = async (event) => {
    event.preventDefault()
    await onSubmit({
      endTime,
      revenue: Math.max(0, Number(revenue) || 0),
    })
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
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors">
              ยกเลิก
            </button>
            <button type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-950/40 flex items-center gap-1.5">
              <CheckCircle size={14} />
              บันทึกจบไลฟ์
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
