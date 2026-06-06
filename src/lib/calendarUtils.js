// src/lib/calendarUtils.js
// ─────────────────────────────────────────────────────────────
// ฟังก์ชันช่วยเหลือเกี่ยวกับการจัดการปฏิทินและจัดรูปแบบข้อมูลของกิจกรรม
// ─────────────────────────────────────────────────────────────

/**
 * รายชื่อเดือนในภาษาไทย เรียงจากมกราคมถึงธันวาคม
 * @type {string[]}
 */
export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

/**
 * การตั้งค่าคลาส CSS และข้อมูลเบื้องต้นของประเภทกิจกรรมแต่ละแบบ (Commission, Live Stream, Clip)
 * @type {Object}
 */
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

/**
 * แปลงค่าสถานะให้อยู่ในรูปตัวพิมพ์เล็ก และเป็น String เพื่อให้อ่านง่าย
 * 
 * @param {string} status - สถานะที่ส่งมาจากฐานข้อมูล
 * @returns {string} สถานะที่ถูกจัดรูปแบบแล้ว (ตัวพิมพ์เล็ก)
 */
export function normalizeStatus(status) {
  return String(status ?? 'pending').toLowerCase()
}

/**
 * แปลงออบเจกต์ Date ให้เป็นคีย์สำหรับเดือนในรูปแบบ 'YYYY-MM'
 * 
 * @param {Date} date - ออบเจกต์วันที่ต้องการแปลง
 * @returns {string} คีย์เดือนรูปแบบ 'YYYY-MM'
 */
export function toMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * แปลงเลขปี เดือน วัน ให้เป็นคีย์วันที่รูปแบบ 'YYYY-MM-DD'
 * 
 * @param {number} year - ปี ค.ศ.
 * @param {number} month - ดัชนีเดือน (0-11)
 * @param {number} day - เลขวันที่ (1-31)
 * @returns {string} คีย์วันที่รูปแบบ 'YYYY-MM-DD'
 */
export function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * แปลงรูปแบบวันที่จาก YYYY-MM-DD เป็นรูปแบบไทยคือ DD/MM/YYYY
 * 
 * @param {string} dateStr - วันที่ในรูปแบบ 'YYYY-MM-DD'
 * @returns {string} วันที่ฟอร์แมตไทย 'DD/MM/YYYY'
 */
export function formatThaiDate(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

/**
 * ตัดเวลาให้เหลือแค่หน่วย ชั่วโมง:นาที (HH:MM)
 * 
 * @param {string} timeStr - เวลาที่มีวินาทีรวมอยู่ด้วย (เช่น '14:30:00')
 * @returns {string} เวลาในรูปแบบ 'HH:MM'
 */
export function formatTime(timeStr) {
  return timeStr?.slice(0, 5) ?? ''
}

/**
 * ดึงเวลาปัจจุบันในรูปแบบ 24 ชั่วโมง (HH:MM)
 * 
 * @returns {string} เวลาปัจจุบัน (เช่น '08:45')
 */
export function getCurrentTime24() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/**
 * คำนวณหาจำนวนวันทั้งหมดในเดือน และวันแรกของสัปดาห์ เพื่อใช้วาดตารางปฏิทิน
 * 
 * @param {number} year - ปี ค.ศ.
 * @param {number} month - เดือน (0-11)
 * @returns {Array<number|null>} อาร์เรย์ของวันที่ (มี null ปลอกหน้าสำหรับวันว่างต้นเดือน)
 */
export function getCalendarDays(year, month) {
  const totalDays = new Date(year, month + 1, 0).getDate()
  const firstDayIndex = new Date(year, month, 1).getDay()
  return [
    ...Array(firstDayIndex).fill(null),
    ...Array.from({ length: totalDays }, (_, index) => index + 1),
  ]
}

/**
 * แปลงแถวข้อมูล Commission จาก Database ให้เป็นรูปแบบมาตรฐานของ Event บนปฏิทิน
 * 
 * TODO: Bug Risk - ในการหา ownerName, นิพจน์ row.owner ?? row.owner?.display_name อาจคืนค่าเป็นออบเจกต์ (Object) 
 * หาก row.owner มีค่าเป็น Object (เช่น จาก Supabase Raw Join) แทนที่จะเป็นสตริง (String) ซึ่งจะทำให้ React แครชเมื่อเรนเดอร์ออบเจกต์ตรง ๆ
 * 
 * @param {Object} row - ข้อมูลดิบจากฐานข้อมูล
 * @returns {Object} ข้อมูลกิจกรรมประเภท Commission
 */
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

/**
 * แปลงแถวข้อมูล Live Stream จาก Database ให้เป็นรูปแบบมาตรฐานของ Event บนปฏิทิน
 * 
 * @param {Object} row - ข้อมูลดิบจากฐานข้อมูล
 * @returns {Object} ข้อมูลกิจกรรมประเภท Live Stream
 */
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

/**
 * แปลงแถวข้อมูล Clip จาก Database ให้เป็นรูปแบบมาตรฐานของ Event บนปฏิทิน
 * 
 * @param {Object} row - ข้อมูลดิบจากฐานข้อมูล
 * @returns {Object} ข้อมูลกิจกรรมประเภท Video Clip
 */
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

/**
 * แปลงข้อมูลจากทุกประเภท (Commissions, Streams, Clips) มารวมกันและกรองเฉพาะแถวที่มีการตั้งค่าวันที่
 * 
 * @param {Object} payload - ออบเจกต์ที่บรรจุอาร์เรย์ของข้อมูลทั้งสามรูปแบบ
 * @param {Array} [payload.commissions] - รายการคอมมิชชัน
 * @param {Array} [payload.streams] - รายการสตรีม
 * @param {Array} [payload.clips] - รายการคลิป
 * @returns {Array<Object>} กิจกรรมทั้งหมดที่ผ่านการฟอร์แมตแล้ว
 */
export function normalizeCalendarEvents({ commissions = [], streams = [], clips = [] }) {
  return [
    ...commissions.map(normalizeCommissionEvent),
    ...streams.map(normalizeStreamEvent),
    ...clips.map(normalizeClipEvent),
  ].filter(event => event.date || event.startDate)
}

/**
 * ตรวจสอบว่ากิจกรรมเกิดขึ้นในวันที่ระบุหรือไม่ (รองรับช่วงวันที่ของ Commission)
 * 
 * @param {Object} event - ข้อมูลกิจกรรม
 * @param {string} dateStr - วันที่เปรียบเทียบรูปแบบ 'YYYY-MM-DD'
 * @returns {boolean} true ถ้าเกิดในวันนั้น
 */
export function eventOccursOnDate(event, dateStr) {
  if (event.type === 'commission') {
    return event.startDate <= dateStr && event.endDate >= dateStr
  }
  return event.date === dateStr
}

/**
 * คัดกรองรายการกิจกรรมเฉพาะที่มีการจัดขึ้นในวันที่ระบุ
 * 
 * @param {Array<Object>} events - รายการกิจกรรมทั้งหมด
 * @param {string} dateStr - วันที่คัดกรองรูปแบบ 'YYYY-MM-DD'
 * @returns {Array<Object>} รายการกิจกรรมที่ตรงกับวันนั้น
 */
export function getEventsForDate(events, dateStr) {
  return events.filter(event => eventOccursOnDate(event, dateStr))
}

/**
 * กรองกิจกรรมที่จะนำไปแสดงบนหน้าปฏิทินตามสิทธิ์การใช้งาน (Role) และฟิลเตอร์ที่เลือก
 * 
 * @param {Array<Object>} events - กิจกรรมทั้งหมด
 * @param {Object} filters - ฟิลเตอร์การแสดงผล
 * @param {string} filters.role - บทบาทของผู้ใช้ (vtuber, admin, team)
 * @param {string} filters.userId - ไอดีผู้ใช้ล็อกอิน (UUID)
 * @param {string} filters.filterMode - รูปแบบการกรอง (specific-vtuber, my-schedule, all-vtubers)
 * @param {number} [filters.selectedTalentId] - ไอดีวีทูเบอร์ที่เลือก (ถ้ามี)
 * @returns {Array<Object>} กิจกรรมที่ผ่านการกรองแล้ว
 */
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
