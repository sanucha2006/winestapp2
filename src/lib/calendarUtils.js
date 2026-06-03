export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

export const EVENT_TYPE_CONFIG = {
  commission: {
    label: 'Commission',
    iconLabel: 'งาน',
    previewPrefix: 'COM',
    markerClass: 'bg-indigo-400',
    badgeClass: 'bg-indigo-600 text-white',
    previewClass: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/15',
    cardClass: 'bg-indigo-900/15 border-indigo-500/25',
    doneClass: 'bg-emerald-900/15 border-emerald-500/20 opacity-70',
  },
  stream: {
    label: 'Live Stream',
    iconLabel: 'ไลฟ์',
    previewPrefix: 'LIVE',
    markerClass: 'bg-violet-400',
    badgeClass: 'bg-purple-600 text-white',
    previewClass: 'bg-purple-600/20 text-purple-300 border-purple-500/15',
    cardClass: 'bg-purple-900/15 border-purple-500/25',
    doneClass: 'bg-slate-800/40 border-slate-600 opacity-70',
  },
  clip: {
    label: 'Video / Clip',
    iconLabel: 'คลิป',
    previewPrefix: 'CLIP',
    markerClass: 'bg-cyan-400',
    badgeClass: 'bg-pink-600 text-white',
    previewClass: 'bg-pink-600/20 text-pink-300 border-pink-500/15',
    cardClass: 'bg-pink-900/15 border-pink-500/25',
    doneClass: 'bg-slate-800/40 border-slate-600 opacity-70',
  },
}

export function normalizeStatus(status) {
  return String(status ?? 'pending').toLowerCase()
}

export function toMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatThaiDate(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export function formatTime(timeStr) {
  return timeStr?.slice(0, 5) ?? ''
}

export function getCurrentTime24() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function getCalendarDays(year, month) {
  const totalDays = new Date(year, month + 1, 0).getDate()
  const firstDayIndex = new Date(year, month, 1).getDay()
  return [
    ...Array(firstDayIndex).fill(null),
    ...Array.from({ length: totalDays }, (_, index) => index + 1),
  ]
}

export function normalizeCommissionEvent(row) {
  const startDate = row.startDate ?? row.start_date ?? ''
  const endDate = row.endDate ?? row.end_date ?? startDate
  const talentName = row.talent ?? row.talents?.talent_name ?? 'ไม่ระบุ'
  const ownerName = row.owner ?? row.owner?.display_name ?? row.profiles?.display_name ?? 'ไม่ระบุ'

  return {
    id: row.id,
    type: 'commission',
    title: row.title,
    date: startDate,
    startDate,
    endDate,
    talentId: row.talentId ?? row.talent_id ?? null,
    talentName,
    owner: ownerName,
    ownerId: row.ownerId ?? row.owner_id ?? null,
    createdBy: row.ownerId ?? row.owner_id ?? null,
    status: normalizeStatus(row.status),
    priority: row.priority ?? 'Medium',
    revenue: Number(row.revenue ?? row.totalRevenue ?? row.total_revenue ?? 0),
    partners: row.partners ?? row.commission_partners?.map(partner => ({
      name: partner.profiles?.display_name ?? 'Unknown',
      userId: partner.profiles?.id,
      amount: Number(partner.share_amount || 0),
    })) ?? [],
    raw: row,
  }
}

export function normalizeStreamEvent(row) {
  const date = row.date ?? row.stream_date ?? ''

  return {
    id: row.id,
    type: 'stream',
    title: row.title,
    date,
    startDate: date,
    endDate: date,
    talentId: row.talentId ?? row.talent_id ?? null,
    talentName: row.talent ?? row.talents?.talent_name ?? 'ไม่ระบุ',
    createdBy: row.createdBy ?? row.created_by ?? null,
    status: normalizeStatus(row.status),
    time: row.time ?? formatTime(row.start_time),
    endTime: row.endTime ?? formatTime(row.end_time),
    platform: row.platform ?? 'YouTube',
    needsThumbnail: row.needsThumbnail ?? row.needs_thumbnail ?? false,
    thumbnailDone: row.thumbnailDone ?? row.thumbnail_done ?? false,
    revenue: Number(row.revenue ?? 0),
    raw: row,
  }
}

export function normalizeClipEvent(row) {
  const date = row.date ?? row.publish_date ?? ''
  const format = row.format ?? 'Short'
  const ideaTitle = row.ideaTitle ?? row.idea_title ?? row.idea ?? ''
  const title = row.idea ?? (format ? `[${format === 'Short' ? 'คลิปสั้น' : 'คลิปยาว'}] ${ideaTitle}` : ideaTitle)

  return {
    id: row.id,
    type: 'clip',
    title,
    ideaTitle,
    date,
    startDate: date,
    endDate: date,
    talentId: row.talentId ?? row.talent_id ?? null,
    talentName: row.talent ?? row.talents?.talent_name ?? 'ไม่ระบุ',
    createdBy: row.createdBy ?? row.created_by ?? null,
    status: normalizeStatus(row.status),
    format,
    needsScript: row.needsScript ?? row.needs_script ?? false,
    scriptDone: row.scriptDone ?? row.script_done ?? false,
    needsThumbnail: row.needsThumbnail ?? row.needs_thumbnail ?? false,
    thumbnailDone: row.thumbnailDone ?? row.thumbnail_done ?? false,
    raw: row,
  }
}

export function normalizeCalendarEvents({ commissions = [], streams = [], clips = [] }) {
  return [
    ...commissions.map(normalizeCommissionEvent),
    ...streams.map(normalizeStreamEvent),
    ...clips.map(normalizeClipEvent),
  ].filter(event => event.date || event.startDate)
}

export function eventOccursOnDate(event, dateStr) {
  if (event.type === 'commission') {
    return event.startDate <= dateStr && event.endDate >= dateStr
  }
  return event.date === dateStr
}

export function getEventsForDate(events, dateStr) {
  return events.filter(event => eventOccursOnDate(event, dateStr))
}

export function filterCalendarEvents(events, { role, userId, filterMode, selectedTalentId } = {}) {
  if (role === 'vtuber') return events

  if (role === 'admin') {
    if (filterMode === 'specific-vtuber') {
      return events.filter(event => event.talentId === selectedTalentId)
    }
    return events
  }

  if (role === 'team') {
    if (filterMode === 'my-schedule') {
      return events.filter(event => {
        if (event.type === 'commission') return true
        return event.createdBy === userId
      })
    }
    if (filterMode === 'all-vtubers') {
      return events.filter(event => event.type !== 'commission')
    }
    if (filterMode === 'specific-vtuber') {
      return events.filter(event => event.type !== 'commission' && event.talentId === selectedTalentId)
    }
  }

  return events
}
