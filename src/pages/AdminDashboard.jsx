import { useState } from 'react'
import {
  TrendingUp,
  Users,
  DollarSign,
  Tv,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react'

const initialTalentsData = [
  { id: 1, name: 'Hoshina Yuki', superchat: 120000, merch: 45000, status: 'Paid' },
  { id: 2, name: 'Aoi Kuroha', superchat: 95000, merch: 30000, status: 'Paid' },
  { id: 3, name: 'Sakura Mochi', superchat: 145000, merch: 60000, status: 'Pending' },
  { id: 4, name: 'Kage Akuma', superchat: 75000, merch: 15830, status: 'Paid' },
]

export default function AdminDashboard() {
  const [data, setData] = useState(initialTalentsData)

  // Calculations
  const calculateTotal = (type) => {
    return data.reduce((acc, curr) => acc + curr[type], 0)
  }

  const totalSuperchat = calculateTotal('superchat')
  const totalMerch = calculateTotal('merch')
  const totalGrossRevenue = totalSuperchat + totalMerch
  
  // Splits
  const agencyRevenue = totalGrossRevenue * 0.60 // 60%
  const talentRevenue = totalGrossRevenue * 0.40 // 40%

  return (
    <div className="p-8 animate-in fade-in max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/40">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h1>
            <p className="text-gray-400 text-sm">Real-time financials & talent splits overview</p>
          </div>
        </div>
        
        {/* Quick Date Indicator */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 flex items-center gap-2 self-start md:self-auto text-xs text-gray-400">
          <Clock size={14} className="text-violet-400" />
          <span>Billing Period: May 2026</span>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-violet-500/30 transition-all duration-200 relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-2xl group-hover:bg-violet-600/10 transition-all duration-200" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-violet-600/15 flex items-center justify-center">
              <DollarSign size={16} className="text-violet-400" />
            </div>
            <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight size={10} /> +12%
            </span>
          </div>
          <p className="text-2xl font-extrabold text-white">฿{totalGrossRevenue.toLocaleString()}</p>
          <p className="text-gray-500 text-xs mt-1">Total Gross Revenue</p>
        </div>

        {/* Agency Share (60%) */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-violet-500/30 transition-all duration-200 relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-2xl group-hover:bg-violet-600/10 transition-all duration-200" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-violet-600/15 flex items-center justify-center">
              <TrendingUp size={16} className="text-violet-400" />
            </div>
            <span className="text-[10px] text-violet-400 font-bold tracking-wider bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
              60% CUT
            </span>
          </div>
          <p className="text-2xl font-extrabold text-violet-400">฿{agencyRevenue.toLocaleString()}</p>
          <p className="text-gray-500 text-xs mt-1">Net Agency Share</p>
        </div>

        {/* Talents Share (40%) */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-violet-500/30 transition-all duration-200 relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 rounded-full blur-2xl group-hover:bg-purple-600/10 transition-all duration-200" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-purple-600/15 flex items-center justify-center">
              <Users size={16} className="text-purple-400" />
            </div>
            <span className="text-[10px] text-purple-400 font-bold tracking-wider bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
              40% CUT
            </span>
          </div>
          <p className="text-2xl font-extrabold text-purple-400">฿{talentRevenue.toLocaleString()}</p>
          <p className="text-gray-500 text-xs mt-1">Talent Payout Total</p>
        </div>

        {/* Active Streams */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-indigo-500/30 transition-all duration-200 relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 rounded-full blur-2xl group-hover:bg-indigo-600/10 transition-all duration-200" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/15 flex items-center justify-center">
              <Tv size={16} className="text-indigo-400" />
            </div>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-2xl font-extrabold text-white">4 Talents</p>
          <p className="text-gray-500 text-xs mt-1">Managed Roster Size</p>
        </div>
      </div>

      {/* Revenue Splitter Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Revenue Splitter</h2>
            <p className="text-gray-400 text-xs">Income breakdown & payout statuses per contract model</p>
          </div>
          
          <button className="self-start sm:self-auto bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-violet-950/50">
            Generate Payout Report
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-950/65 text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-800">
                <th className="py-4 px-6">VTuber Name</th>
                <th className="py-4 px-6">Superchats/Subs</th>
                <th className="py-4 px-6">Merch Sales</th>
                <th className="py-4 px-6 text-violet-400">Agency Share (60%)</th>
                <th className="py-4 px-6 text-purple-400">Talent Share (40%)</th>
                <th className="py-4 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {data.map((talent) => {
                const gross = talent.superchat + talent.merch
                const agencySplit = gross * 0.60
                const talentSplit = gross * 0.40

                return (
                  <tr key={talent.id} className="hover:bg-gray-800/30 transition-colors duration-150">
                    {/* VTuber */}
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                          {talent.name.charAt(0)}
                        </div>
                        <span className="text-sm font-semibold text-white">{talent.name}</span>
                      </div>
                    </td>
                    
                    {/* Superchats */}
                    <td className="py-4.5 px-6 text-sm text-gray-300">
                      ฿{talent.superchat.toLocaleString()}
                    </td>

                    {/* Merch */}
                    <td className="py-4.5 px-6 text-sm text-gray-300">
                      ฿{talent.merch.toLocaleString()}
                    </td>

                    {/* Agency Split */}
                    <td className="py-4.5 px-6 text-sm font-semibold text-violet-400">
                      ฿{agencySplit.toLocaleString()}
                    </td>

                    {/* Talent Split */}
                    <td className="py-4.5 px-6 text-sm font-semibold text-purple-400">
                      ฿{talentSplit.toLocaleString()}
                    </td>

                    {/* Status */}
                    <td className="py-4.5 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        talent.status === 'Paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {talent.status === 'Paid' && <CheckCircle size={12} />}
                        {talent.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
