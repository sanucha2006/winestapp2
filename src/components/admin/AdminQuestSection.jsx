// src/components/admin/AdminQuestSection.jsx
// ─────────────────────────────────────────────────────────────
// Tab 3 — Quest Management
// Create Quest + Assign Quest + Quest Verification Grid (Force Verify)
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Send, ShieldCheck, Loader2, RefreshCw,
  Film, Tv2, Star, Trophy,
} from 'lucide-react'
import Card from '../common/Card'
import StatusBadge from '../common/StatusBadge'
import Spinner from '../common/Spinner'
import { FREQ_CONFIG, TARGET_CONFIG } from '../vtuber/QuestCard'
import {
  getAllQuests,
  createQuest,
  assignQuestToTalents,
  getInProgressQuestTransactions,
  adminForceVerifyQuest,
} from '../../lib/adminService'

/**
 * แสดงฟอร์มสร้าง Quest master record สำหรับ Admin
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {Function} props.onCreated - callback เมื่อสร้าง Quest สำเร็จ
 * @param {Function} props.showToast - callback สำหรับแสดง toast แจ้งผล
 * @returns {React.ReactElement} ฟอร์มสร้าง Quest ใหม่
 */
function CreateQuestForm({ onCreated, showToast }) {
  const [form, setForm] = useState({
    title: '', description: '', frequency: 'weekly',
    targetType: 'short_video', targetValue: 1, rewardStars: 5,
  })
  const [saving, setSaving] = useState(false)

  /**
   * อัปเดต field เดียวของฟอร์มสร้าง Quest
   *
   * @param {string} k - ชื่อ field ที่ต้องการอัปเดต
   * @param {string|number} v - ค่าใหม่ของ field
   * @returns {void} ไม่มีค่า return
   */
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  /**
   * Submit ฟอร์มสร้าง Quest และ reset form เมื่อสร้างสำเร็จ
   *
   * @param {React.FormEvent<HTMLFormElement>} e - submit event จากฟอร์ม
   * @returns {Promise<void>} Promise ที่ resolve เมื่อสร้างหรือแจ้ง error เสร็จ
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const quest = await createQuest({
        title:       form.title.trim(),
        description: form.description.trim() || undefined,
        frequency:   form.frequency,
        targetType:  form.targetType,
        targetValue: form.targetType === 'livestream' ? Number(form.targetValue) * 60 : Number(form.targetValue),
        rewardStars: Number(form.rewardStars),
      })
      onCreated(quest)
      setForm({ title: '', description: '', frequency: 'weekly', targetType: 'short_video', targetValue: 1, rewardStars: 5 })
    } catch (e) {
      showToast?.('สร้าง Quest ไม่สำเร็จ: ' + e.message, false)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-[#161622] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500/40 transition-colors'
  const labelCls = 'text-[10px] font-bold text-slate-500 uppercase tracking-wide'

  return (
    <Card className="p-4">
      <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-4 pb-2.5 border-b border-white/[0.04]">
        <Plus size={13} className="text-violet-400" /> สร้าง Quest ใหม่
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2 space-y-1">
            <label className={labelCls}>ชื่อ Quest *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="เช่น สตรีม 10 ชั่วโมงในสัปดาห์นี้" required className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>คำอธิบาย</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>ความถี่</label>
            <select value={form.frequency} onChange={e => set('frequency', e.target.value)} className={inputCls}>
              <option value="daily">รายวัน</option>
              <option value="weekly">รายสัปดาห์</option>
              <option value="monthly">รายเดือน</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>ประเภทเป้าหมาย</label>
            <select value={form.targetType} onChange={e => set('targetType', e.target.value)} className={inputCls}>
              <option value="short_video">คลิปสั้น</option>
              <option value="livestream">ไลฟ์สตรีม (ชั่วโมง)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>เป้าหมาย (จำนวน)</label>
            <input type="number" step="0.5" min="0.5" value={form.targetValue} onChange={e => set('targetValue', e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>รางวัล ⭐ Stars</label>
            <input type="number" min="1" value={form.rewardStars} onChange={e => set('rewardStars', e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <button type="submit" disabled={saving}
            className="flex items-center gap-1.5 text-[10px] font-bold px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-colors cursor-pointer">
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            {saving ? 'กำลังสร้าง...' : 'สร้าง Quest'}
          </button>
        </div>
      </form>
    </Card>
  )
}

/**
 * แสดงฟอร์มมอบหมาย Quest ให้ VTuber หนึ่งคนหรือหลายคน
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {Array<Object>} props.quests - รายการ Quest master สำหรับเลือกมอบหมาย
 * @param {Array<Object>} props.talents - รายการ VTuber ที่สามารถรับ Quest
 * @param {Function} props.showToast - callback สำหรับแสดง toast แจ้งผล
 * @param {Function} props.onAssigned - callback หลังมอบหมาย Quest สำเร็จ
 * @returns {React.ReactElement} ฟอร์มมอบหมาย Quest
 */
function AssignQuestForm({ quests, talents, showToast, onAssigned }) {
  const [form, setForm] = useState({ questId: '', talentIds: [], assignedDate: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)

  /**
   * อัปเดต field เดียวของฟอร์มมอบหมาย Quest
   *
   * @param {string} k - ชื่อ field ที่ต้องการอัปเดต
   * @param {string|string[]} v - ค่าใหม่ของ field
   * @returns {void} ไม่มีค่า return
   */
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  /**
   * สลับการเลือก VTuber ในฟอร์มมอบหมาย Quest
   *
   * @param {number} id - id ของ VTuber ที่ต้องการเลือกหรือยกเลิก
   * @returns {void} ไม่มีค่า return
   */
  const handleTalentToggle = (id) => {
    setForm(p => ({
      ...p,
      talentIds: p.talentIds.includes(id)
        ? p.talentIds.filter(t => t !== id)
        : [...p.talentIds, id],
    }))
  }

  /**
   * Submit การมอบหมาย Quest ให้ VTuber ที่เลือก
   *
   * @param {React.FormEvent<HTMLFormElement>} e - submit event จากฟอร์ม
   * @returns {Promise<void>} Promise ที่ resolve เมื่อมอบหมายหรือแจ้ง error เสร็จ
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.questId || form.talentIds.length === 0) return
    setSaving(true)
    try {
      await assignQuestToTalents(Number(form.questId), form.talentIds.map(Number), form.assignedDate)
      setForm(p => ({ ...p, talentIds: [] }))
      showToast?.(`มอบหมาย Quest ให้ ${form.talentIds.length} VTuber สำเร็จ`, true)
      onAssigned?.()
    } catch (e) {
      showToast?.('มอบหมาย Quest ไม่สำเร็จ: ' + e.message, false)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-[#161622] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500/40 transition-colors'
  const labelCls = 'text-[10px] font-bold text-slate-500 uppercase tracking-wide'

  return (
    <Card className="p-4">
      <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-4 pb-2.5 border-b border-white/[0.04]">
        <Send size={13} className="text-indigo-400" /> มอบหมาย Quest
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className={labelCls}>เลือก Quest *</label>
          <select value={form.questId} onChange={e => set('questId', e.target.value)} required className={inputCls}>
            <option value="">— เลือก Quest —</option>
            {quests.map(q => (
              <option key={q.id} value={q.id}>{q.title} ({FREQ_CONFIG[q.frequency]?.label ?? q.frequency})</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelCls}>เลือก VTuber (เลือกได้หลายคน)</label>
          <div className="grid grid-cols-2 gap-1.5 bg-[#161622] border border-white/[0.07] rounded-lg p-2">
            {talents.map(t => (
              <label key={t.id} className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                <input
                  type="checkbox"
                  checked={form.talentIds.includes(t.id)}
                  onChange={() => handleTalentToggle(t.id)}
                  className="w-3 h-3 accent-indigo-500"
                />
                <span className="text-xs text-slate-300">{t.talent_name}</span>
              </label>
            ))}
            {talents.length === 0 && <p className="text-xs text-slate-500 col-span-2 py-1">ไม่มี VTuber ที่ Active</p>}
          </div>
        </div>
        <div className="space-y-1">
          <label className={labelCls}>วันที่มอบหมาย</label>
          <input type="date" value={form.assignedDate} onChange={e => set('assignedDate', e.target.value)} className={inputCls} />
        </div>
        <div className="flex justify-end pt-1">
          <button type="submit" disabled={saving || !form.questId || form.talentIds.length === 0}
            className="flex items-center gap-1.5 text-[10px] font-bold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors cursor-pointer">
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            {saving ? 'กำลังมอบหมาย...' : `มอบหมายให้ ${form.talentIds.length || '...'} คน`}
          </button>
        </div>
      </form>
    </Card>
  )
}

/**
 * แสดงตาราง Quest transaction ที่ยังไม่สำเร็จ พร้อมปุ่ม Force Verify
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {Array<Object>} props.transactions - รายการ quest transaction ที่ต้องตรวจสอบ
 * @param {Function} props.onForceVerify - callback เมื่อกด Force Verify
 * @param {number|null} props.verifying - id ของ transaction ที่กำลังตรวจสอบอยู่
 * @returns {React.ReactElement} ตารางตรวจสอบ Quest หรือ empty state
 */
function QuestVerificationGrid({ transactions, onForceVerify, verifying }) {
  if (transactions.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Trophy size={24} className="text-slate-600 mx-auto mb-2" />
        <p className="text-xs text-slate-500">ไม่มีเควสที่ค้างอยู่ในระบบ</p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2">
        <ShieldCheck size={13} className="text-emerald-400" />
        <span className="text-xs font-bold text-slate-300">Quest Verification Grid</span>
        <span className="ml-auto text-[10px] text-slate-500 bg-[#161622] px-2 py-0.5 rounded font-bold">
          {transactions.length} รายการ
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.04] bg-[#0a0a12]">
              {['VTuber', 'Quest', 'ประเภท', 'ความถี่', 'ความคืบหน้า', 'รางวัล', 'วันที่', 'Force Verify'].map(h => (
                <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {transactions.map(tx => {
              const q      = tx.quests ?? {}
              const freq   = FREQ_CONFIG[q.frequency]
              const targetCfg = TARGET_CONFIG[q.target_type]
              const current  = tx.current_value ?? 0
              const target   = q.target_value ?? 1
              const pct      = Math.min(100, Math.round((current / target) * 100))
              const isLive   = q.target_type === 'livestream'
              const isVerifying = verifying === tx.id

              const formatValue = (v) => Number.isInteger(v) ? v : Number(v.toFixed(1))
              const displayCurrent = isLive ? formatValue(current / 60) : current
              const displayTarget  = isLive ? formatValue(target / 60) : target

              return (
                <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-3 py-2.5 text-xs font-semibold text-slate-200 whitespace-nowrap">
                    {tx.talents?.talent_name ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-300 max-w-[180px] truncate">
                    {q.title ?? '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      {targetCfg?.icon && <targetCfg.icon size={11} />} {targetCfg?.label ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {freq && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${freq.bg} ${freq.border} ${freq.text}`}>
                        {freq.label}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-300 shrink-0">
                        {displayCurrent}/{displayTarget}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1 text-[10px] text-amber-400">
                      <Star size={10} className="fill-amber-400" /> {q.reward_stars ?? 0}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[10px] text-slate-500 whitespace-nowrap">
                    {tx.assigned_date?.slice(0, 10) ?? '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => onForceVerify(tx.id, tx.talent_id)}
                      disabled={isVerifying}
                      className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                    >
                      {isVerifying
                        ? <><Loader2 size={10} className="animate-spin" /> ตรวจสอบ...</>
                        : <><ShieldCheck size={10} /> Force Verify</>
                      }
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/**
 * แสดงแท็บ Admin Quest Management สำหรับสร้าง มอบหมาย และตรวจสอบ Quest
 *
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {Array<Object>} props.talents - รายชื่อ VTuber ทั้งหมด
 * @param {Function} props.showToast - callback แสดง Toast
 * @param {number} [props.refreshKey] - global refresh trigger
 * @returns {React.ReactElement} Section จัดการ Quest สำหรับ Admin
 */
export default function AdminQuestSection({ talents = [], showToast, refreshKey = 0 }) {
  const [quests, setQuests]             = useState([])
  const [transactions, setTransactions] = useState([])
  const [loadingInit, setLoadingInit]   = useState(true)
  const [verifyingId, setVerifyingId]   = useState(null)

  // โหลดทั้ง Quest master list และ transaction ที่ยังไม่สำเร็จสำหรับตารางตรวจสอบ
  /**
   * โหลด Quest master list และ transaction ที่ยังไม่สำเร็จสำหรับแท็บนี้
   *
   * @param {void} ไม่มี parameter
   * @returns {Promise<void>} Promise ที่ resolve เมื่อโหลดข้อมูลและอัปเดต state เสร็จ
   */
  const loadAll = useCallback(async () => {
    setLoadingInit(true)
    try {
      const [q, tx] = await Promise.all([getAllQuests(), getInProgressQuestTransactions()])
      setQuests(q)
      setTransactions(tx)
    } catch (e) {
      showToast?.('โหลดข้อมูล Quest ไม่สำเร็จ: ' + e.message, false)
    } finally {
      setLoadingInit(false)
    }
  }, [showToast, refreshKey]) // refreshKey บังคับ reload เมื่อกด Refresh

  useEffect(() => { loadAll() }, [loadAll])

  /**
   * เพิ่ม Quest ที่สร้างใหม่เข้า state และแจ้งผลสำเร็จ
   *
   * @param {Object} quest - Quest ที่สร้างสำเร็จจาก service layer
   * @returns {void} ไม่มีค่า return
   */
  const handleQuestCreated = useCallback((quest) => {
    setQuests(prev => [quest, ...prev])
    showToast?.('สร้าง Quest สำเร็จ ✓', true)
  }, [showToast])

  /**
   * โหลดรายการ transaction ใหม่หลังมอบหมาย Quest สำเร็จ
   *
   * @param {void} ไม่มี parameter
   * @returns {Promise<void>} Promise ที่ resolve เมื่อ reload transaction เสร็จ
   */
  const handleQuestAssigned = useCallback(async () => {
    try {
      const tx = await getInProgressQuestTransactions()
      setTransactions(tx)
    } catch (e) {
      showToast?.('โหลดข้อมูล Transactions ใหม่ไม่สำเร็จ: ' + e.message, false)
    }
  }, [showToast])

  /**
   * สั่งตรวจสอบ Quest transaction แบบ Admin Force Verify และอัปเดตตารางตามผลลัพธ์
   *
   * @param {number} transactionId - id ของ talent_quest_transactions
   * @param {number} talentId - id ของ VTuber เจ้าของ transaction
   * @returns {Promise<void>} Promise ที่ resolve เมื่อ verify และอัปเดต state เสร็จ
   */
  const handleForceVerify = useCallback(async (transactionId, talentId) => {
    setVerifyingId(transactionId)
    try {
      const result = await adminForceVerifyQuest(transactionId, talentId)
      if (!result) { showToast?.('ไม่ได้รับผลลัพธ์จากระบบ', false); return }
      showToast?.(result.status_message, result.is_success)
      if (result.is_success) {
        // ลบออกจาก grid เพราะ is_done = true แล้ว
        setTransactions(prev => prev.filter(tx => tx.id !== transactionId))
      } else {
        // อัปเดต current_value
        setTransactions(prev => prev.map(tx =>
          tx.id === transactionId ? { ...tx, current_value: result.updated_value } : tx
        ))
      }
    } catch (e) {
      showToast?.(e.message || 'Force Verify ไม่สำเร็จ', false)
    } finally {
      setVerifyingId(null)
    }
  }, [showToast])

  if (loadingInit) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-4">
      

      {/* Create + Assign forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CreateQuestForm onCreated={handleQuestCreated} showToast={showToast} />
        <AssignQuestForm quests={quests} talents={talents} showToast={showToast} onAssigned={handleQuestAssigned} />
      </div>

      {/* Verification Grid */}
      <QuestVerificationGrid
        transactions={transactions}
        onForceVerify={handleForceVerify}
        verifying={verifyingId}
      />
    </div>
  )
}
