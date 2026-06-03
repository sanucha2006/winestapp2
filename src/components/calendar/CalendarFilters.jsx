export default function CalendarFilters({
  role,
  filterMode,
  onFilterModeChange,
  talents,
  selectedTalentId,
  onSelectedTalentChange,
}) {
  if (role === 'vtuber') return null

  const modes = role === 'admin'
    ? [
        { mode: 'all', label: 'ทั้งหมด', active: 'bg-indigo-600 text-white' },
        { mode: 'specific-vtuber', label: 'เลือก VTuber', active: 'bg-pink-600 text-white' },
      ]
    : [
        { mode: 'my-schedule', label: 'My Tasks', active: 'bg-indigo-600 text-white' },
        { mode: 'all-vtubers', label: 'All VTubers', active: 'bg-purple-600 text-white' },
        { mode: 'specific-vtuber', label: 'Select VTuber', active: 'bg-pink-600 text-white' },
      ]

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-[#0d0d14]">
      <div className="flex items-center gap-1 bg-[#161622] p-1 rounded-lg border border-white/[0.06]">
        {modes.map(({ mode, label, active }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onFilterModeChange(mode)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-all
              ${filterMode === mode ? active : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {filterMode === 'specific-vtuber' && (
        <select
          value={selectedTalentId ?? ''}
          onChange={event => onSelectedTalentChange(Number(event.target.value))}
          className="bg-[#161622] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-pink-500 h-[30px] min-w-[140px]"
        >
          {talents.map(talent => (
            <option key={talent.id} value={talent.id}>{talent.talent_name}</option>
          ))}
        </select>
      )}
    </div>
  )
}
