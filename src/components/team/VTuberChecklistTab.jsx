// src/components/team/VTuberChecklistTab.jsx
// ─────────────────────────────────────────────────────────────
// Tab 2 — VTuber Checklist (To Do List)
// แสดง commission ค้าง + สถานะ thumbnail/script ที่รอดำเนินการ
// ─────────────────────────────────────────────────────────────
import {
  Layers, Video, Film, CheckCircle2, AlertCircle,
  ChevronRight, Trash2,
} from 'lucide-react'
import Card from '../common/Card'

/**
 * แสดงแท็บ Checklist สำหรับ VTuber เพื่อติดตาม commission, thumbnail, script และ clip ที่เกี่ยวข้อง
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {string} props.userId - User ID ของ VTuber ปัจจุบัน
 * @param {Array<Object>} props.teamTasks - รายการ commission ที่ต้องแสดงใน checklist
 * @param {Array<Object>} props.streams - รายการ stream ทั้งหมดสำหรับกรองงานของ VTuber ปัจจุบัน
 * @param {Array<Object>} props.shorts - รายการ clip/short ทั้งหมดสำหรับกรองงานของ VTuber ปัจจุบัน
 * @param {Object|null} props.myProfile - โปรไฟล์ของผู้ใช้ปัจจุบัน
 * @param {Function} props.toggleStreamThumbnail - callback สำหรับสลับสถานะ thumbnail ของ stream
 * @param {Function} props.toggleClipThumbnail - callback สำหรับสลับสถานะ thumbnail ของ clip
 * @param {Function} props.toggleScript - callback สำหรับสลับสถานะ script ของ clip
 * @param {Function} props.advanceTeamTask - callback สำหรับเลื่อนสถานะ commission
 * @param {Function} props.onDeleteEvent - callback สำหรับลบ Event ตาม id และ type
 * @returns {React.ReactElement} แท็บ Checklist ของ VTuber พร้อมรายการงานที่ต้องติดตาม
 */
export default function VTuberChecklistTab({
  userId,
  teamTasks,
  streams,
  shorts,
  myProfile,
  toggleStreamThumbnail,
  toggleClipThumbnail,
  toggleScript,
  advanceTeamTask,
  onDeleteEvent,
}) {
  const allCommissions = teamTasks
  // TODO: Bug Risk - พิจารณา useMemo สำหรับการจัดเรียง/กรองข้อมูล เพราะ filter streams/shorts ใน render body
  const ownStreams = streams.filter(s => s.createdBy === userId)
  const ownShorts = shorts.filter(c => c.createdBy === userId)

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-3 pb-2.5 border-b border-white/[0.04]">
          <Layers size={13} className="text-indigo-400" /> Commission ทั้งหมด
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {allCommissions.map(t => (
            <div key={t.id} className={`p-3.5 rounded-xl border flex flex-col justify-between transition-opacity
              ${t.status === 'done' ? 'bg-[#0a1813] border-emerald-500/20 opacity-60' : 'bg-[#161622] border-white/[0.04]'}`}>
              <div>
                <div className="flex justify-between items-start gap-2 mb-0.5">
                  <p className="text-sm font-bold text-slate-200 truncate flex-1">{t.title}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                    t.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    t.status === 'in_progress' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}>
                    {t.status === 'done' ? 'สำเร็จ' : t.status === 'in_progress' ? 'กำลังทำ' : 'รอดำเนิน'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">กำหนดส่ง: {t.endDate?.split('-').reverse().join('/') ?? '-'}</p>
                <div className="mt-2.5 flex gap-1.5 flex-wrap">
                  {t.partners?.map(p => (
                    // TODO: Bug Risk - key ใช้ p.name ซึ่งอาจซ้ำกันได้ ควรใช้ userId หรือ id ที่เสถียรกว่าเมื่อข้อมูลพร้อม
                    <span key={p.name} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">ผู้ช่วย: {p.name}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1.5 mt-3 border-t border-white/[0.04] pt-3">
                {t.status !== 'done' && (
                  <button onClick={() => advanceTeamTask(t.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-colors
                      bg-indigo-500/10 text-indigo-400 border-indigo-500/25 hover:bg-indigo-500/20">
                    <ChevronRight size={12} />
                    {t.status === 'pending' ? 'เริ่มทำ' : 'สำเร็จ'}
                  </button>
                )}
                <button onClick={() => onDeleteEvent({ id: t.id, type: 'commission' })}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/25 hover:border-red-500/50">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {allCommissions.length === 0 && <p className="text-xs text-slate-500 col-span-2 py-3">ไม่มี Commission</p>}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-3 pb-2.5 border-b border-white/[0.04]">
            <Video size={13} className="text-purple-400" /> ปกสตรีม
          </h3>
          <div className="space-y-2">
            {/* TODO: Bug Risk - พิจารณา useMemo สำหรับการจัดเรียง/กรองข้อมูล เพราะ filter ownStreams ใน render body ก่อน map */}
            {ownStreams.filter(s => s.needsThumbnail && s.status !== 'done').map(s => (
              <div key={s.id} className="flex items-center justify-between bg-[#161622] p-3 rounded-xl border border-white/[0.04]">
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-bold text-slate-200 truncate">{s.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{s.talent} | {s.date?.split('-').reverse().join('/') ?? '-'}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <button onClick={() => toggleStreamThumbnail(s.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors
                      ${s.thumbnailDone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-amber-500/10 text-amber-400 border-amber-500/25'}`}>
                    {s.thumbnailDone ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {s.thumbnailDone ? 'พร้อม' : 'ยังไม่ทำ'}
                  </button>
                  <button onClick={() => onDeleteEvent({ id: s.id, type: 'stream' })}
                    className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/25 hover:border-red-500/50">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-3 pb-2.5 border-b border-white/[0.04]">
            <Film size={13} className="text-pink-400" /> Videos
          </h3>
          <div className="space-y-2">
            {/* TODO: Bug Risk - พิจารณา useMemo สำหรับการจัดเรียง/กรองข้อมูล เพราะ filter ownShorts ใน render body ก่อน map */}
            {ownShorts.filter(c => (c.needsScript || c.needsThumbnail) && c.status !== 'done').map(s => (
              <div key={s.id} className="bg-[#161622] p-3 rounded-xl border border-white/[0.04]">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <p className="text-xs font-bold text-slate-200 truncate flex-1">{s.idea}</p>
                  <button onClick={() => onDeleteEvent({ id: s.id, type: 'clip' })}
                    className="p-0.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/25 hover:border-red-500/50 shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">{s.talent} | {s.date?.split('-').reverse().join('/') ?? '-'}</p>
                <div className="flex gap-2">
                  {s.needsScript && (
                    <button onClick={() => toggleScript(s.id)}
                      className={`flex-1 flex justify-center items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors
                        ${s.scriptDone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-amber-500/10 text-amber-400 border-amber-500/25'}`}>
                      {s.scriptDone ? 'สคริปต์เสร็จ' : 'ยังไม่เขียนบท'}
                    </button>
                  )}
                  {s.needsThumbnail && (
                    <button onClick={() => toggleClipThumbnail(s.id)}
                      className={`flex-1 flex justify-center items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors
                        ${s.thumbnailDone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-amber-500/10 text-amber-400 border-amber-500/25'}`}>
                      {s.thumbnailDone ? 'ปกพร้อม' : 'ยังไม่ทำปก'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
