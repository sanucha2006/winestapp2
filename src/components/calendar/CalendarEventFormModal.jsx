import { Loader2, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { getCommissionFinancials } from '../../lib/financeUtils'

export default function CalendarEventFormModal({
  date,
  talents,
  teamMembers,
  currentUserId,
  myProfile,
  allowedTypes = ['commission', 'stream', 'clip'],
  saving = false,
  onSubmit,
  onClose,
}) {
  const [taskType, setTaskType] = useState(allowedTypes[0] ?? 'stream')
  const [commission, setCommission] = useState({ title: '', revenue: 0, startDate: date, endDate: date, description: '', talentId: '' })
  const [partners, setPartners] = useState([])
  const [partnerSelect, setPartnerSelect] = useState('')
  const firstTalentId = talents[0]?.id ? String(talents[0].id) : ''
  const [stream, setStream] = useState({ title: '', talentId: firstTalentId, startTime: '20:00', needsThumbnail: true, platform: 'YouTube' })
  const [clip, setClip] = useState({ title: '', talentId: firstTalentId, format: 'Short', needsScript: true, needsThumbnail: true })

  const financials = getCommissionFinancials({ revenue: commission.revenue, partners })

  const handleAddPartner = () => {
    if (!partnerSelect) return
    const [userId, name] = partnerSelect.split('|')
    if (partners.find(partner => partner.userId === userId)) return
    setPartners(prev => [...prev, { userId, name, amount: 0 }])
    setPartnerSelect('')
  }

  const handlePartnerAmountChange = (index, newAmount) => {
    let value = Math.max(0, Number(newAmount))
    const otherTotal = partners.reduce((sum, partner, partnerIndex) => partnerIndex !== index ? sum + partner.amount : sum, 0)
    if (value + otherTotal > financials.teamPool) value = financials.teamPool - otherTotal
    const updated = [...partners]
    updated[index].amount = value
    setPartners(updated)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = taskType === 'commission'
      ? { ...commission, partners }
      : taskType === 'stream'
        ? stream
        : clip
    await onSubmit(taskType, payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="bg-[#15151f] border border-slate-700/60 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/60 flex justify-between items-center bg-[#1a1a28]">
          <h3 className="font-bold text-sm text-white">เพิ่มงานใหม่</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-[#15151f] max-h-[70vh] overflow-y-auto">
          <div className="flex bg-[#0f0f17] p-1 rounded-xl border border-slate-700/60 gap-1">
            {allowedTypes.map(type => (
              <button key={type} type="button" onClick={() => setTaskType(type)}
                className={`flex-1 text-xs py-2 rounded-lg font-bold capitalize transition-all ${taskType === type ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {type}
              </button>
            ))}
          </div>

          {taskType === 'commission' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="ชื่องาน *">
                  <input required value={commission.title} onChange={event => setCommission(prev => ({ ...prev, title: event.target.value }))}
                    className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </Field>
                <Field label="รายได้รวม (บาท)">
                  <input type="number" min="0" value={commission.revenue} onChange={event => setCommission(prev => ({ ...prev, revenue: Math.max(0, Number(event.target.value)) }))}
                    className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="วันเริ่มต้น">
                  <input type="date" required value={commission.startDate} onChange={event => setCommission(prev => ({ ...prev, startDate: event.target.value }))}
                    className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none [color-scheme:dark]" />
                </Field>
                <Field label="วันสิ้นสุด">
                  <input type="date" required value={commission.endDate} onChange={event => setCommission(prev => ({ ...prev, endDate: event.target.value }))}
                    className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none [color-scheme:dark]" />
                </Field>
              </div>
              <Field label="VTuber ที่เกี่ยวข้อง">
                <TalentSelect value={commission.talentId} talents={talents} allowEmpty onChange={value => setCommission(prev => ({ ...prev, talentId: value }))} />
              </Field>

              <div className="bg-[#0f0f17] border border-slate-700/60 p-4 rounded-xl space-y-3">
                <p className="text-xs font-bold text-slate-300">แบ่งรายได้ให้ทีมงาน</p>
                <div className="flex items-end gap-2">
                  <select value={partnerSelect} onChange={event => setPartnerSelect(event.target.value)}
                    className="flex-1 bg-[#15151f] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                    <option value="">-- เลือกทีมงาน --</option>
                    {teamMembers
                      .filter(member => member.id !== currentUserId && !partners.some(partner => partner.userId === member.id))
                      .map(member => (
                        <option key={member.id} value={`${member.id}|${member.display_name}`}>{member.display_name}</option>
                      ))}
                  </select>
                  <button type="button" onClick={handleAddPartner}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-1 text-xs transition-colors">
                    <Plus size={15} /> เพิ่ม
                  </button>
                </div>
                <div className="space-y-2 pt-1 border-t border-slate-700">
                  <div className="flex items-center justify-between bg-indigo-900/20 p-2.5 rounded-lg border border-indigo-500/20">
                    <span className="text-xs font-bold text-indigo-300">{myProfile?.display_name ?? 'ฉัน'} (ส่วนที่เหลือจาก 90%)</span>
                    <span className="text-xs font-bold text-white">{financials.ownerShare.toLocaleString()} บาท</span>
                  </div>
                  {partners.map((partner, index) => (
                    <div key={partner.userId} className="flex items-center gap-2 bg-slate-800/50 p-2.5 rounded-lg border border-slate-700">
                      <button type="button" onClick={() => setPartners(prev => prev.filter(item => item.userId !== partner.userId))} className="text-red-400 hover:bg-red-400/20 p-1 rounded-lg"><Trash2 size={13} /></button>
                      <span className="text-xs font-medium text-slate-200 flex-1">{partner.name}</span>
                      <input type="number" min="0" value={partner.amount} onChange={event => handlePartnerAmountChange(index, event.target.value)}
                        className="w-24 bg-[#15151f] border border-slate-600 rounded-lg px-2 py-1 text-xs text-right text-white focus:outline-none" />
                      <span className="text-xs text-slate-400">บ.</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {taskType === 'stream' && (
            <div className="space-y-3">
              <Field label="หัวข้อการสตรีม *">
                <input required value={stream.title} onChange={event => setStream(prev => ({ ...prev, title: event.target.value }))}
                  className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="เลือก VTuber *">
                  <TalentSelect value={stream.talentId} talents={talents} onChange={value => setStream(prev => ({ ...prev, talentId: value }))} />
                </Field>
                <Field label="เวลาเริ่ม">
                  <input type="text" required inputMode="numeric" pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$" maxLength={5}
                    value={stream.startTime} onChange={event => setStream(prev => ({ ...prev, startTime: event.target.value }))}
                    className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" placeholder="20:00" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Platform">
                  <Segmented value={stream.platform} options={['YouTube', 'Twitch']} color="purple" onChange={value => setStream(prev => ({ ...prev, platform: value }))} />
                </Field>
                <Toggle label="ต้องการปกจากทีม" checked={stream.needsThumbnail} onChange={checked => setStream(prev => ({ ...prev, needsThumbnail: checked }))} />
              </div>
            </div>
          )}

          {taskType === 'clip' && (
            <div className="space-y-3">
              <Field label="หัวข้อคลิป / ไอเดีย *">
                <input required value={clip.title} onChange={event => setClip(prev => ({ ...prev, title: event.target.value }))}
                  className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="เลือก VTuber *">
                  <TalentSelect value={clip.talentId} talents={talents} onChange={value => setClip(prev => ({ ...prev, talentId: value }))} />
                </Field>
                <Field label="รูปแบบ">
                  <Segmented value={clip.format} options={['Short', 'Long']} color="pink" labels={{ Short: 'Shorts', Long: 'Full' }} onChange={value => setClip(prev => ({ ...prev, format: value }))} />
                </Field>
              </div>
              <div className="bg-[#0f0f17] p-3 rounded-xl border border-slate-700 space-y-3">
                <Toggle label="ต้องการบท/สคริปต์จากทีม" checked={clip.needsScript} onChange={checked => setClip(prev => ({ ...prev, needsScript: checked }))} />
                <div className="border-t border-slate-700 pt-3">
                  <Toggle label="ต้องการภาพปกคลิปจากทีม" checked={clip.needsThumbnail} onChange={checked => setClip(prev => ({ ...prev, needsThumbnail: checked }))} plain />
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={15} className="animate-spin" /> กำลังบันทึก...</> : 'บันทึกแผนงาน'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-slate-300 font-medium mb-1 block">{label}</label>
      {children}
    </div>
  )
}

function TalentSelect({ value, talents, onChange, allowEmpty = false }) {
  return (
    <select required={!allowEmpty} value={value} onChange={event => onChange(event.target.value)}
      className="w-full bg-[#0f0f17] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
      {allowEmpty && <option value="">-- ไม่ระบุ --</option>}
      {!allowEmpty && <option value="">-- เลือก --</option>}
      {talents.map(talent => <option key={talent.id} value={talent.id}>{talent.talent_name}</option>)}
    </select>
  )
}

function Segmented({ value, options, labels = {}, color, onChange }) {
  const activeClass = color === 'pink' ? 'bg-pink-600 text-white' : 'bg-purple-600 text-white'
  return (
    <div className="flex bg-[#15151f] p-1 rounded-xl border border-slate-700 gap-1">
      {options.map(option => (
        <button key={option} type="button" onClick={() => onChange(option)}
          className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-all ${value === option ? activeClass : 'text-slate-400'}`}>
          {labels[option] ?? option}
        </button>
      ))}
    </div>
  )
}

function Toggle({ label, checked, onChange, plain = false }) {
  return (
    <div className={`${plain ? '' : 'bg-[#0f0f17] p-3 rounded-xl border border-slate-700'} flex items-center justify-between`}>
      <label className="text-xs font-bold text-slate-200">{label}</label>
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="w-4 h-4 rounded accent-purple-500" />
    </div>
  )
}
