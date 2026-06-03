import { memo, useMemo } from 'react'
import { Calendar, CheckCircle, Clock, Film, Plus, Trash2, Tv2, X } from 'lucide-react'
import StatusBadge from '../common/StatusBadge'
import { EVENT_TYPE_CONFIG, formatThaiDate, formatTime } from '../../lib/calendarUtils'
import { getCommissionFinancials, getStreamFinancials } from '../../lib/financeUtils'

function CalendarEventDetailModal({
  date,
  events,
  role,
  permissions,
  myProfile,
  onClose,
  onCreateClick,
  onUpdateEvent,
  onDeleteEvent,
  onEndStreamClick,
}) {
  const grouped = useMemo(() => ({
    commission: events.filter(event => event.type === 'commission'),
    stream: events.filter(event => event.type === 'stream'),
    clip: events.filter(event => event.type === 'clip'),
  }), [events])
  const isEmpty = events.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`bg-[#0d0d16] border border-white/[0.06] rounded-2xl w-full ${role === 'vtuber' ? 'max-w-md' : 'max-w-xl'} overflow-hidden shadow-2xl flex flex-col max-h-[78vh]`}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex justify-between items-center bg-[#10101b] px-5 py-4 border-b border-white/[0.04]">
          <span className="text-sm font-bold text-violet-400 flex items-center gap-2">
            <Calendar size={15} />
            ตารางงาน {formatThaiDate(date)}
          </span>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white bg-white/5 p-1 rounded-lg transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {isEmpty ? (
            <div className="text-center py-8">
              <Calendar size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">ไม่มีคิวงานในวันนี้</p>
            </div>
          ) : (
            <>
              {grouped.commission.length > 0 && (
                <Section title={`Commission (${grouped.commission.length})`} icon={CheckCircle} color="text-indigo-400">
                  {grouped.commission.map(event => (
                    <CommissionEventCard
                      key={event.id}
                      event={event}
                      permissions={permissions}
                      myProfile={myProfile}
                      onUpdateEvent={onUpdateEvent}
                      onDeleteEvent={onDeleteEvent}
                    />
                  ))}
                </Section>
              )}
              {grouped.stream.length > 0 && (
                <Section title={`ไลฟ์สตรีม (${grouped.stream.length})`} icon={Tv2} color="text-violet-400">
                  {grouped.stream.map(event => (
                    <StreamEventCard
                      key={event.id}
                      event={event}
                      role={role}
                      permissions={permissions}
                      onUpdateEvent={onUpdateEvent}
                      onDeleteEvent={onDeleteEvent}
                      onEndStreamClick={onEndStreamClick}
                    />
                  ))}
                </Section>
              )}
              {grouped.clip.length > 0 && (
                <Section title={`คลิป (${grouped.clip.length})`} icon={Film} color="text-cyan-400">
                  {grouped.clip.map(event => (
                    <ClipEventCard
                      key={event.id}
                      event={event}
                      role={role}
                      permissions={permissions}
                      onUpdateEvent={onUpdateEvent}
                      onDeleteEvent={onDeleteEvent}
                    />
                  ))}
                </Section>
              )}
            </>
          )}
        </div>

        {permissions.canCreate && (
          <div className="px-5 py-3.5 bg-[#10101b] border-t border-white/[0.04] flex justify-end">
            <button type="button" onClick={onCreateClick} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md">
              <Plus size={15} /> เพิ่มงานใหม่
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, color, children }) {
  return (
    <div className="space-y-2">
      <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${color}`}>
        <Icon size={11} /> {title}
      </p>
      {children}
    </div>
  )
}

function CommissionEventCard({ event, permissions, myProfile, onUpdateEvent, onDeleteEvent }) {
  const cfg = EVENT_TYPE_CONFIG.commission
  const financials = getCommissionFinancials(event)
  const isDone = event.status === 'done'

  return (
    <div className={`p-3.5 rounded-xl border text-sm ${isDone ? cfg.doneClass : cfg.cardClass}`}>
      <div className="flex justify-between items-start mb-1.5">
        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${cfg.badgeClass}`}>Commission</span>
        <ActionGroup
          event={event}
          permissions={permissions}
          doneLabel="เสร็จสิ้น"
          onDone={() => onUpdateEvent(event, { status: 'done' })}
          onDelete={() => onDeleteEvent(event)}
        />
      </div>
      <h4 className={`font-bold text-white ${isDone ? 'line-through text-slate-400' : ''}`}>{event.title}</h4>
      <p className="text-slate-300 mt-1 text-xs">รายได้รวม: <span className="text-emerald-400 font-bold">{financials.gross.toLocaleString()}</span> บาท</p>
      {permissions.canViewFinancials && (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <MoneyBox label="บริษัท 10%" value={financials.companyShare} color="text-violet-300" />
            <MoneyBox label="ทีม 90%" value={financials.teamPool} color="text-indigo-300" />
          </div>
          {event.partners?.length > 0 && (
            <div className="mt-2 bg-[#1e1e2e] p-2.5 rounded-lg border border-slate-700 text-xs">
              <p className="text-slate-400 mb-1 font-bold">สัดส่วนรายได้:</p>
              <p className="text-white">{event.owner ?? myProfile?.display_name ?? 'ฉัน'}: {financials.ownerShare.toLocaleString()} บ.</p>
              {event.partners.map((partner, index) => (
                <p key={`${partner.userId}-${index}`} className="text-slate-300">- {partner.name}: {partner.amount.toLocaleString()} บ.</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StreamEventCard({ event, role, permissions, onUpdateEvent, onDeleteEvent, onEndStreamClick }) {
  const cfg = EVENT_TYPE_CONFIG.stream
  const isDone = event.status === 'done'
  const financials = getStreamFinancials(event)

  return (
    <div className={`p-3.5 rounded-xl border text-sm ${isDone ? cfg.doneClass : cfg.cardClass}`}>
      <div className="flex justify-between items-start mb-1.5">
        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${cfg.badgeClass}`}>Live Stream</span>
        <ActionGroup
          event={event}
          permissions={{ ...permissions, canEditStatus: permissions.canEndStream }}
          doneLabel="จบไลฟ์"
          onDone={() => onEndStreamClick(event)}
          onDelete={() => onDeleteEvent(event)}
        />
      </div>
      <div className="flex justify-between items-start gap-2">
        <h4 className="font-bold text-white">{event.title}</h4>
        {role === 'vtuber' && <StatusBadge status={event.status} />}
      </div>
      <p className="text-slate-300 mt-1 text-xs">วีทูบเบอร์: {event.talentName} | เวลา: {event.time} น. {event.endTime && `(จบ: ${event.endTime})`}</p>
      {role === 'vtuber' && (
        <div className="flex items-center gap-3 mt-2">
          {event.time && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock size={10} className="text-slate-500" /> {formatTime(event.time)}
              {event.endTime ? ` - ${formatTime(event.endTime)}` : ''}
            </span>
          )}
          <span className="text-[10px] text-slate-500">{event.platform}</span>
        </div>
      )}
      {permissions.canEditStatus && (
        <div className="mt-2 flex items-center justify-between bg-[#1e1e2e] p-2 rounded-lg border border-slate-700 text-xs">
          <span className="text-slate-300">{event.needsThumbnail ? (event.thumbnailDone ? 'ปก: เสร็จแล้ว' : 'ปก: รอดำเนินการ') : 'ปก: ไม่ต้องการ'}</span>
          {event.needsThumbnail && !event.thumbnailDone && (
            <button type="button" onClick={() => onUpdateEvent(event, { thumbnailDone: true })} className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg transition-colors">ทำปกเสร็จ</button>
          )}
        </div>
      )}
      {permissions.canViewFinancials && event.revenue > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <MoneyBox label="รายได้รวม" value={financials.gross} color="text-emerald-400" />
          <MoneyBox label="บริษัท 60%" value={financials.companyShare} color="text-violet-300" />
          <MoneyBox label="VTuber 40%" value={financials.talentShare} color="text-emerald-300" />
        </div>
      )}
    </div>
  )
}

function ClipEventCard({ event, role, permissions, onUpdateEvent, onDeleteEvent }) {
  const cfg = EVENT_TYPE_CONFIG.clip
  const isDone = event.status === 'done'

  return (
    <div className={`p-3.5 rounded-xl border text-sm ${isDone ? cfg.doneClass : cfg.cardClass}`}>
      <div className="flex justify-between items-start mb-1.5">
        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${cfg.badgeClass}`}>Video / Clip</span>
        <ActionGroup
          event={event}
          permissions={permissions}
          doneLabel="เผยแพร่แล้ว"
          onDone={() => onUpdateEvent(event, { status: 'done' })}
          onDelete={() => onDeleteEvent(event)}
        />
      </div>
      <div className="flex justify-between items-start gap-2">
        <h4 className="font-bold text-white">{role === 'vtuber' ? event.ideaTitle : event.title}</h4>
        {role === 'vtuber' && <StatusBadge status={event.status} />}
      </div>
      <p className="text-slate-300 mt-1 text-xs">วีทูบเบอร์: {event.talentName}</p>
      <div className="flex flex-col gap-1.5 mt-2">
        {event.needsScript && (
          <CheckRow
            label={event.scriptDone ? 'สคริปต์: เสร็จแล้ว' : 'สคริปต์: รอดำเนินการ'}
            done={event.scriptDone}
            actionLabel="ส่งสคริปต์แล้ว"
            canAct={permissions.canEditStatus}
            onClick={() => onUpdateEvent(event, { scriptDone: true })}
          />
        )}
        {event.needsThumbnail && (
          <CheckRow
            label={event.thumbnailDone ? 'ปกคลิป: เสร็จแล้ว' : 'ปกคลิป: รอดำเนินการ'}
            done={event.thumbnailDone}
            actionLabel="ทำปกเสร็จ"
            canAct={permissions.canEditStatus}
            onClick={() => onUpdateEvent(event, { thumbnailDone: true })}
          />
        )}
      </div>
    </div>
  )
}

function ActionGroup({ event, permissions, doneLabel, onDone, onDelete }) {
  if (!permissions.canEditStatus && !permissions.canDelete) return null

  return (
    <div className="flex gap-1.5">
      {permissions.canEditStatus && event.status !== 'done' && (
        <button type="button" onClick={onDone} className="text-[10px] flex items-center gap-1 text-emerald-400 hover:bg-emerald-500/20 px-2 py-0.5 rounded transition-colors">
          <CheckCircle size={12} /> {doneLabel}
        </button>
      )}
      {permissions.canDelete && (
        <button type="button" onClick={onDelete} className="text-red-400 hover:bg-red-500/20 p-1 rounded transition-colors"><Trash2 size={13} /></button>
      )}
    </div>
  )
}

function MoneyBox({ label, value, color }) {
  return (
    <div className="bg-[#1e1e2e] p-2 rounded-lg border border-slate-700">
      <p className="text-slate-500 text-[10px]">{label}</p>
      <p className={`${color} font-bold`}>{value.toLocaleString()} บ.</p>
    </div>
  )
}

function CheckRow({ label, done, actionLabel, canAct, onClick }) {
  return (
    <div className="flex items-center justify-between bg-[#1e1e2e] p-2 rounded-lg border border-slate-700 text-xs">
      <span className="text-slate-300">{label}</span>
      {canAct && !done && (
        <button type="button" onClick={onClick} className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg transition-colors">
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default memo(CalendarEventDetailModal)
