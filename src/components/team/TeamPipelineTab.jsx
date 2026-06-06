// src/components/team/TeamPipelineTab.jsx
// ─────────────────────────────────────────────────────────────
// Tab 3 — Team Pipeline & Goals
// สรุปรายได้รายเดือน + Kanban Board ติดตามสถานะ commission
// ─────────────────────────────────────────────────────────────
import { Wallet, BarChart3, CheckCircle2, Layers } from 'lucide-react'
import Card from '../common/Card'
import KanbanCard from './KanbanCard'
import { getCommissionFinancials, getStreamFinancials } from '../../lib/financeUtils'

/**
 * แสดงแท็บ Pipeline ของทีม พร้อมสรุปรายได้และ Kanban Board ของ commission
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {Array<Object>} props.teamTasks - รายการงาน commission ของทีม
 * @param {Array<Object>} props.streams - รายการ stream สำหรับคำนวณรายได้ฝั่งบริษัทและ VTuber
 * @param {Function} props.advanceTeamTask - callback สำหรับเลื่อนสถานะงาน commission รับ task id เป็น argument
 * @returns {React.ReactElement} แท็บ Pipeline พร้อมการ์ดสรุปรายได้และ Kanban Board
 */
export default function TeamPipelineTab({ teamTasks, streams, advanceTeamTask }) {
  // TODO: Bug Risk - พิจารณา useMemo สำหรับการจัดเรียง/กรองข้อมูล เพราะ filter teamTasks หลายรอบใน render body
  const todoTasks     = teamTasks.filter(t => t.status === 'pending')
  const progressTasks = teamTasks.filter(t => t.status === 'in_progress')
  const doneTasks     = teamTasks.filter(t => t.status === 'done')

  // TODO: Bug Risk - พิจารณา useMemo สำหรับการคำนวณข้อมูลสรุปรายได้จาก doneTasks ใน render body
  const commissionFinancials = doneTasks.reduce((total, task) => {
    const financials = getCommissionFinancials(task)
    return {
      gross: total.gross + financials.gross,
      companyShare: total.companyShare + financials.companyShare,
      teamPool: total.teamPool + financials.teamPool,
    }
  }, { gross: 0, companyShare: 0, teamPool: 0 })

  // TODO: Bug Risk - พิจารณา useMemo สำหรับการคำนวณข้อมูลสรุปรายได้จาก streams ใน render body
  const streamFinancials = streams.reduce((total, stream) => {
    const financials = getStreamFinancials(stream)
    return {
      gross: total.gross + financials.gross,
      companyShare: total.companyShare + financials.companyShare,
      talentShare: total.talentShare + financials.talentShare,
    }
  }, { gross: 0, companyShare: 0, talentShare: 0 })

  const companyRevenue = commissionFinancials.companyShare + streamFinancials.companyShare

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'ยอดบริษัท', subtitle: '60% จากไลฟ์ + 10% จากงานทีม', value: companyRevenue, icon: Wallet, cls: 'text-violet-300 border-violet-500/20 bg-violet-500/10' },
          { title: 'รายได้ทีมสุทธิ', subtitle: '90% ของ commission ก่อนแบ่งผู้ร่วมงาน', value: commissionFinancials.teamPool, icon: BarChart3, cls: 'text-indigo-300 border-indigo-500/20 bg-indigo-500/10' },
          { title: 'รายได้ VTuber', subtitle: '40% ของยอดไลฟ์ที่สรุปแล้ว', value: streamFinancials.talentShare, icon: Wallet, cls: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10' },
        ].map(({ title, subtitle, value, icon: Icon, cls }) => (
          <Card key={title} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">{title}</p>
                <p className={`text-2xl font-black mt-1 ${cls.split(' ')[0]}`}>฿{value.toLocaleString()}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${cls}`}>
                <Icon size={16} />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">{subtitle}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'รายได้ฝั่งทีมงาน (Team Revenue)', icon: BarChart3, iconCls: 'text-indigo-400', bars: [40,65,85,50], barCls: 'bg-indigo-500', bgCls: 'bg-indigo-900/25' },
          { title: 'รายได้ฝั่ง VTuber (Donates/Ads)',  icon: Wallet,   iconCls: 'text-emerald-400', bars: [55,40,75,95], barCls: 'bg-emerald-500', bgCls: 'bg-emerald-900/25' },
        ].map(({ title, icon: Icon, iconCls, bars, barCls, bgCls }) => (
          <Card key={title} className="p-4">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-2 mb-3">
              <Icon size={13} className={iconCls} /> {title}
            </h3>
            <div className="flex items-end gap-2.5 h-20">
              {bars.map((h, i) => (
                <div key={i} className={`flex-1 ${bgCls} rounded-t-md relative`}>
                  <div className={`absolute bottom-0 w-full ${barCls} rounded-t-md transition-all`} style={{ height: `${h}%` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 mt-1.5">
              {['สัปดาห์ 1','สัปดาห์ 2','สัปดาห์ 3','สัปดาห์ 4'].map(w => <span key={w}>{w}</span>)}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'To Do',       tasks: todoTasks,     dot: 'bg-indigo-500',               color: 'indigo' },
          { label: 'In Progress', tasks: progressTasks, dot: 'bg-amber-500 animate-pulse',  color: 'amber', borderCls: 'border-amber-500/25' },
          { label: 'Done',        tasks: doneTasks,     dot: 'bg-emerald-500',              color: 'done'  },
        ].map(({ label, tasks, dot, color, borderCls }) => (
          <Card key={label} className="p-4 flex flex-col min-h-[340px]">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <h3 className="text-sm font-bold text-white">{label}</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-bold bg-[#161622] px-2 py-0.5 rounded">{tasks.length}</span>
            </div>
            <div className="space-y-2 flex-1">
              {color === 'done' ? tasks.map(task => (
                <div key={task.id} className="bg-[#161622] border border-emerald-500/15 rounded-xl p-3 flex flex-col justify-between opacity-60 hover:opacity-90 transition-opacity">
                  <div>
                    <div className="flex justify-between gap-2 mb-1.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase bg-black/30 px-2 py-0.5 rounded">{task.category}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Done</span>
                    </div>
                    <h4 className="text-slate-500 line-through font-bold text-xs leading-snug">{task.title}</h4>
                  </div>
                  <div className="border-t border-white/[0.04] pt-2 mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-slate-600">{task.talent}</span>
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  </div>
                </div>
              )) : tasks.map(task => (
                <KanbanCard key={task.id} task={task} onAdvance={advanceTeamTask} advanceColor={color} borderCls={borderCls} />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
