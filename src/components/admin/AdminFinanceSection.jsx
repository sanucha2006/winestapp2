// src/components/admin/AdminFinanceSection.jsx
// ─────────────────────────────────────────────────────────────
// Tab 4 — Finance & Revenue Dashboard
// Revenue Leaderboard + Time Filter + Bar Chart + Pie Chart
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Wallet, BarChart3, Calendar, TrendingUp, Crown } from 'lucide-react'
import Card from '../common/Card'
import Spinner from '../common/Spinner'
import { getAllBillingRecords } from '../../lib/adminService'
import { getStreams } from '../../lib/supabaseservice'

// ── Palette สำหรับ Pie Chart ──
const PIE_COLORS = ['#7c3aed', '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed']

/**
 * แสดง tooltip สำหรับกราฟรายได้รายเดือนของหน้า Finance
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {boolean} props.active - สถานะว่า tooltip กำลัง active หรือไม่
 * @param {Array<Object>} props.payload - รายการข้อมูลที่ Recharts ส่งให้ tooltip
 * @param {string} props.label - label ของแกน X ที่กำลัง hover
 * @returns {React.ReactElement|null} Tooltip ของกราฟ หรือ null เมื่อไม่มีข้อมูล
 */
function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d0d16] border border-white/[0.08] rounded-xl px-3 py-2.5 shadow-xl text-[11px]">
      <p className="text-slate-400 font-bold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: ฿{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  )
}

/**
 * แสดงแท็บ Admin Finance & Revenue พร้อม leaderboard, summary cards, bar chart และ pie chart
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {Function} props.showToast - callback สำหรับแสดง toast แจ้งผล
 * @param {number} [props.refreshKey=0] - key สำหรับบังคับ reload เมื่อกด Refresh จากหน้า Admin หลัก
 * @returns {React.ReactElement} Section การเงินและรายได้สำหรับ Admin
 */
export default function AdminFinanceSection({ showToast, refreshKey = 0 }) {
  // selectedMonth: 'YYYY-MM' หรือ null = All Time
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const [leaderboard, setLeaderboard]   = useState([])
  const [barData, setBarData]           = useState([])
  const [pieData, setPieData]           = useState([])
  const [loading, setLoading]           = useState(false)

  const [billingRecords, setBillingRecords] = useState([])
  const [streams, setStreams] = useState([])

  /**
   * โหลด billing records และ streams ทั้งหมดเพื่อใช้คำนวณกราฟและ leaderboard ในฝั่ง client
   *
   * @param {void} ไม่มี parameter
   * @returns {Promise<void>} Promise ที่ resolve เมื่อโหลดข้อมูลและอัปเดต state เสร็จ
   */
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [records, allStreams] = await Promise.all([
        getAllBillingRecords(),
        getStreams()
      ])
      setBillingRecords(records)
      setStreams(allStreams)
    } catch (e) {
      showToast?.('โหลดข้อมูลการเงินไม่สำเร็จ: ' + e.message, false)
    } finally {
      setLoading(false)
    }
  }, [showToast, refreshKey]) // refreshKey บังคับ reload เมื่อกด Refresh

  useEffect(() => { loadData() }, [loadData])

  // รวมข้อมูล billing และ stream revenue ให้เป็นชุดข้อมูลสำหรับ leaderboard และ chart
  useEffect(() => {
    const filteredRecords = selectedMonth 
      ? billingRecords.filter(r => r.period === selectedMonth)
      : billingRecords

    const filteredStreams = selectedMonth
      ? streams.filter(s => s.stream_date?.startsWith(selectedMonth))
      : streams

    const lbMap = new Map()
    for (const row of filteredRecords) {
      const id = row.talent_id
      if (!lbMap.has(id)) {
        lbMap.set(id, {
          talentId:     id,
          talentName:   row.talents?.talent_name ?? 'ไม่ระบุ',
          grossRevenue: 0,
          companyShare: 0,
          talentShare:  0,
          superchat:    0,
          merch:        0,
        })
      }
      const entry = lbMap.get(id)
      entry.superchat    += Number(row.superchat)  || 0
      entry.merch        += Number(row.merch)      || 0
      entry.grossRevenue += (Number(row.superchat) || 0) + (Number(row.merch) || 0)
      entry.companyShare += Number(row.agency_cut) || 0
      entry.talentShare  += Number(row.talent_cut) || 0
    }

    // รวมรายได้ stream ที่จบแล้วเข้ากับ billing records ด้วยสัดส่วน 60/40
    for (const s of filteredStreams) {
      if (s.status === 'done') {
        const id = s.talent_id
        if (!lbMap.has(id)) {
          lbMap.set(id, {
            talentId:     id,
            talentName:   s.talents?.talent_name ?? 'ไม่ระบุ',
            grossRevenue: 0,
            companyShare: 0,
            talentShare:  0,
            superchat:    0,
            merch:        0,
          })
        }
        const entry = lbMap.get(id)
        const revenue = Number(s.revenue) || 0
        entry.grossRevenue += revenue
        entry.companyShare += revenue * 0.6
        entry.talentShare  += revenue * 0.4
      }
    }

    const lb = [...lbMap.values()].sort((a, b) => b.companyShare - a.companyShare)
    setLeaderboard(lb)
    setPieData(lb.map(t => ({ name: t.talentName, value: t.companyShare })))

    const barMap = new Map()
    // Bar chart ใช้ข้อมูลทุกเดือนเสมอเพื่อให้เห็นแนวโน้มระยะยาว
    const sortedRecords = [...billingRecords].sort((a, b) => a.period.localeCompare(b.period))
    for (const row of sortedRecords) {
      const p = row.period
      if (!barMap.has(p)) barMap.set(p, { month: p, companyShare: 0, grossRevenue: 0 })
      barMap.get(p).companyShare += Number(row.agency_cut) || 0
      barMap.get(p).grossRevenue += (Number(row.superchat) || 0) + (Number(row.merch) || 0)
    }

    const sortedStreams = [...streams].sort((a, b) => (a.stream_date || '').localeCompare(b.stream_date || ''))
    for (const s of sortedStreams) {
      if (s.status === 'done' && s.stream_date) {
        const p = s.stream_date.substring(0, 7) // 'YYYY-MM'
        if (!barMap.has(p)) barMap.set(p, { month: p, companyShare: 0, grossRevenue: 0 })
        const revenue = Number(s.revenue) || 0
        barMap.get(p).companyShare += revenue * 0.6
        barMap.get(p).grossRevenue += revenue
      }
    }

    setBarData([...barMap.values()].sort((a, b) => a.month.localeCompare(b.month)))
  }, [selectedMonth, billingRecords, streams])

  const totalCompany = leaderboard.reduce((s, r) => s + r.companyShare, 0)
  const totalGross   = leaderboard.reduce((s, r) => s + r.grossRevenue, 0)

  return (
    <div className="space-y-4">
      {/* ── Time Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-[#0d0d16] border border-white/[0.05] rounded-xl px-3 py-2">
          <Calendar size={13} className="text-violet-400 shrink-0" />
          <input
            type="month"
            value={selectedMonth ?? ''}
            onChange={e => setSelectedMonth(e.target.value || null)}
            className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer"
          />
        </div>
        <button
          onClick={() => setSelectedMonth(null)}
          className={`text-[10px] font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer
            ${!selectedMonth
              ? 'bg-violet-600/20 text-violet-300 border-violet-500/30'
              : 'bg-white/[0.03] text-slate-400 border-white/[0.06] hover:bg-white/[0.06]'}`}
        >
          <TrendingUp size={11} className="inline mr-1" />
          ยอดรวมทั้งหมด (All Time)
        </button>
        <span className="text-[10px] text-slate-500 ml-auto">
          {selectedMonth ? `กำลังดูเดือน ${selectedMonth}` : 'ยอดรวมตั้งแต่เริ่มต้น'}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <>
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">รายได้รวม (Superchat + Merch)</p>
                  <p className="text-2xl font-black mt-1.5 text-slate-200">฿{totalGross.toLocaleString()}</p>
                </div>
                <div className="w-9 h-9 rounded-xl border flex items-center justify-center bg-slate-500/10 border-slate-500/20">
                  <Wallet size={16} className="text-slate-400" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">ยอดรวมดิบจาก Superchat + Merch ทุก VTuber</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Agency Cut (ส่วนแบ่งบริษัท)</p>
                  <p className="text-2xl font-black mt-1.5 text-violet-300">฿{totalCompany.toLocaleString()}</p>
                </div>
                <div className="w-9 h-9 rounded-xl border flex items-center justify-center bg-violet-500/10 border-violet-500/20">
                  <BarChart3 size={16} className="text-violet-400" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">รายได้สุทธิของบริษัท (agency_cut จาก billing_records)</p>
            </Card>
          </div>

          {/* ── Charts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Bar Chart — Monthly Company Revenue */}
            <Card className="p-4 lg:col-span-2">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-2 mb-4">
                <BarChart3 size={13} className="text-violet-400" /> รายได้บริษัทรายเดือน
              </h3>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false}
                      tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="companyShare" name="ส่วนแบ่งบริษัท" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="grossRevenue" name="รายได้รวม" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-xs text-slate-500">ยังไม่มีข้อมูล</p>
                </div>
              )}
            </Card>

            {/* Pie Chart — VTuber Revenue Share */}
            <Card className="p-4">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-2 mb-4">
                <Wallet size={13} className="text-indigo-400" /> สัดส่วนรายได้ VTuber
              </h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `฿${Number(v).toLocaleString()}`}
                      contentStyle={{ backgroundColor: '#0d0d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-xs text-slate-500">ยังไม่มีข้อมูล</p>
                </div>
              )}
            </Card>
          </div>

          {/* ── Revenue Leaderboard ── */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2">
              <Crown size={13} className="text-amber-400" />
              <span className="text-xs font-bold text-slate-300">Revenue Leaderboard</span>
              <span className="text-[10px] text-slate-500 ml-1">เรียงจาก Agency Cut มากไปน้อย</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.04] bg-[#0a0a12]">
                    {['อันดับ', 'VTuber', 'Superchat', 'Merch', 'Gross รวม', 'Agency Cut', 'Talent Cut'].map(h => (
                      <th key={h} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {leaderboard.map((row, i) => (
                    <tr key={row.talentId} className="hover:bg-white/[0.015] transition-colors">
                      <td className="px-4 py-3">
                        {i === 0
                          ? <Crown size={14} className="text-amber-400" />
                          : <span className="text-[11px] font-bold text-slate-500">#{i + 1}</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                            {row.talentName.charAt(0)}
                          </div>
                          <span className="text-xs font-semibold text-slate-200">{row.talentName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        ฿{(row.superchat ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        ฿{(row.merch ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-300">
                        ฿{row.grossRevenue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-violet-400">
                        ฿{row.companyShare.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-400">
                        ฿{row.talentShare.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {leaderboard.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-500">ยังไม่มีข้อมูลรายได้ในช่วงเวลานี้</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
