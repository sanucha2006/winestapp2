// src/lib/supabaseService.js
// ─────────────────────────────────────────────────────────────
// Central service layer — ทุก component ดึงข้อมูลผ่านไฟล์นี้
// ไม่ query Supabase ตรงใน component เพื่อง่ายต่อการดูแล
// ─────────────────────────────────────────────────────────────
import { supabase } from './supabaseClient'

function getMonthRange(month) {
  const [year, monthNumber] = month.split('-').map(Number)
  const start = `${year}-${String(monthNumber).padStart(2, '0')}-01`
  const nextMonthDate = new Date(year, monthNumber, 1)
  const end = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`

  return { start, end }
}

// ══════════════════════════════════════════════════════════════
// 👤 PROFILES
// ══════════════════════════════════════════════════════════════

/** ดึง profile + role ของ user ที่ล็อกอินอยู่ */
export async function getMyProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

// ══════════════════════════════════════════════════════════════
// 🎤 TALENTS
// ══════════════════════════════════════════════════════════════

/** ดึง VTuber ทั้งหมดที่ active */
export async function getTalents() {
  const { data, error } = await supabase
    .from('talents')
    .select('id, talent_name')
    .eq('is_active', true)
    .order('talent_name')
  if (error) throw error
  return data // [{ id, talent_name }]
}

/** ดึงข้อมูล talent ของตัวเองจาก user_id (สำหรับหน้า VTuber) */
export async function getMyTalentProfile(userId) {
  const { data, error } = await supabase
    .from('talents')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data
}

/** ดึงสมาชิกทีมทั้งหมดที่ active */
export async function getTeamMembers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, role')
    .in('role', ['team', 'vtuber', 'admin'])
    .eq('is_active', true)
    .order('display_name')
  if (error) throw error
  return data
}

// ══════════════════════════════════════════════════════════════
// 💼 COMMISSIONS
// ══════════════════════════════════════════════════════════════

/**
 * ดึง commissions พร้อม partners
 * @param {string} ownerId - profiles.user_id ของ Staff
 */
export async function getCommissions(ownerId) {
  const { data: partnerRows, error: partnerLookupError } = await supabase
    .from('commission_partners')
    .select('commission_id')
    .eq('team_member_id', ownerId)
  if (partnerLookupError) throw partnerLookupError

  const partnerCommissionIds = [...new Set((partnerRows ?? []).map(row => row.commission_id))]

  const { data, error } = await supabase
    .from('commissions')
    .select(`
      *,
      talents ( id, talent_name ),
      owner:profiles!commissions_owner_id_fkey ( id, display_name ),
      commission_partners (
        id,
        share_amount,
        profiles!commission_partners_team_member_id_fkey ( id, display_name )
      )
    `)
    .or(partnerCommissionIds.length > 0
      ? `owner_id.eq.${ownerId},id.in.(${partnerCommissionIds.join(',')})`
      : `owner_id.eq.${ownerId}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** เพิ่ม commission ใหม่ พร้อม partners */
export async function createCommission({ title, ownerId, talentId, priority, startDate, endDate, totalRevenue, description, partners }) {
  // 1. Insert commission
  const { data: comm, error: commErr } = await supabase
    .from('commissions')
    .insert({
      title,
      owner_id:      ownerId,
      talent_id:     talentId || null,
      priority,
      start_date:    startDate,
      end_date:      endDate,
      total_revenue: totalRevenue,
      description,
    })
    .select()
    .single()
  if (commErr) throw commErr

  // 2. Insert partners ถ้ามี
  if (partners && partners.length > 0) {
    const partnerRows = partners.map(p => ({
      commission_id:  comm.id,
      team_member_id: p.userId,
      share_amount:   p.amount,
    }))
    const { error: partnerErr } = await supabase
      .from('commission_partners')
      .insert(partnerRows)
    if (partnerErr) throw partnerErr
  }

  return comm
}

/** อัปเดต status ของ commission */
export async function updateCommissionStatus(id, status) {
  const { error } = await supabase
    .from('commissions')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

/** ลบ commission (จะลบ partners อัตโนมัติถ้าตั้ง CASCADE ใน DB) */
export async function deleteCommission(id) {
  const { error } = await supabase
    .from('commissions')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ══════════════════════════════════════════════════════════════
// 📺 STREAMS
// ══════════════════════════════════════════════════════════════

/**
 * ดึง streams ตาม filter
 * @param {{ talentId?: number, month?: string }} options - month format: 'YYYY-MM'
 */
export async function getStreams({ talentId, month } = {}) {
  let query = supabase
    .from('streams')
    .select(`*, talents ( id, talent_name )`)
    .order('stream_date')

  if (talentId) query = query.eq('talent_id', talentId)
  if (month) {
    const { start, end } = getMonthRange(month)
    query = query.gte('stream_date', start).lt('stream_date', end)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

/** เพิ่ม stream ใหม่ */
export async function createStream({ talentId, createdBy, title, streamDate, startTime, platform, needsThumbnail }) {
  const { data, error } = await supabase
    .from('streams')
    .insert({
      talent_id:       talentId,
      created_by:      createdBy || null,
      title,
      stream_date:     streamDate,
      start_time:      startTime || null,
      platform:        platform || 'YouTube',
      needs_thumbnail: needsThumbnail,
      thumbnail_done:  !needsThumbnail,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/** toggle thumbnail_done */
export async function toggleStreamThumbnail(id, currentValue) {
  const { error } = await supabase
    .from('streams')
    .update({ thumbnail_done: !currentValue })
    .eq('id', id)
  if (error) throw error
}

/** จบสตรีม — อัปเดต status, end_time, revenue */
export async function endStream(id, { endTime, revenue }) {
  const { error } = await supabase
    .from('streams')
    .update({ status: 'ended', end_time: endTime, revenue })
    .eq('id', id)
  if (error) throw error
}

/** ลบ stream */
export async function deleteStream(id) {
  const { error } = await supabase
    .from('streams')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ══════════════════════════════════════════════════════════════
// 🎬 CLIPS
// ══════════════════════════════════════════════════════════════

/**
 * ดึง clips ตาม filter
 * @param {{ talentId?: number, month?: string }} options
 */
export async function getClips({ talentId, month } = {}) {
  let query = supabase
    .from('clips')
    .select(`*, talents ( id, talent_name )`)
    .order('publish_date')

  if (talentId) query = query.eq('talent_id', talentId)
  if (month) {
    const { start, end } = getMonthRange(month)
    query = query.gte('publish_date', start).lt('publish_date', end)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

/** เพิ่ม clip ใหม่ */
export async function createClip({ talentId, createdBy, ideaTitle, publishDate, format, needsScript, needsThumbnail }) {
  const { data, error } = await supabase
    .from('clips')
    .insert({
      talent_id:       talentId,
      created_by:      createdBy || null,
      idea_title:      ideaTitle,
      publish_date:    publishDate || null,
      format:          format || 'Short',
      needs_script:    needsScript,
      script_done:     !needsScript,
      needs_thumbnail: needsThumbnail,
      thumbnail_done:  !needsThumbnail,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/** toggle script_done */
export async function toggleClipScript(id, currentValue) {
  const { error } = await supabase
    .from('clips')
    .update({ script_done: !currentValue })
    .eq('id', id)
  if (error) throw error
}

/** toggle thumbnail_done */
export async function toggleClipThumbnail(id, currentValue) {
  const { error } = await supabase
    .from('clips')
    .update({ thumbnail_done: !currentValue })
    .eq('id', id)
  if (error) throw error
}

/** อัปเดต status ของ clip */
export async function updateClipStatus(id, status) {
  const { error } = await supabase
    .from('clips')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

/** ลบ clip */
export async function deleteClip(id) {
  const { error } = await supabase
    .from('clips')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ══════════════════════════════════════════════════════════════
// 🎯 QUESTS
// ══════════════════════════════════════════════════════════════

/** ดึง quests ของ talent วันนี้ */
export async function getTodayQuests(talentId) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('talent_id', talentId)
    .eq('assigned_date', today)
    .order('id')
  if (error) throw error
  return data
}

/** toggle is_done ของ quest */
export async function toggleQuest(id, currentValue) {
  const { error } = await supabase
    .from('quests')
    .update({ is_done: !currentValue })
    .eq('id', id)
  if (error) throw error
}

// ══════════════════════════════════════════════════════════════
// 💰 BILLING RECORDS (Admin)
// ══════════════════════════════════════════════════════════════

/** ดึง billing records ทั้งหมด พร้อมชื่อ talent */
export async function getBillingRecords() {
  const { data, error } = await supabase
    .from('billing_records')
    .select(`*, talents ( id, talent_name )`)
    .order('period', { ascending: false })
  if (error) throw error
  return data
}

/** อัปเดต status การจ่ายเงิน */
export async function updateBillingStatus(id, status) {
  const { error } = await supabase
    .from('billing_records')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

// ══════════════════════════════════════════════════════════════
// 🔧 UTILITY: แปลง Supabase row → format ที่ component ใช้
// ══════════════════════════════════════════════════════════════

/**
 * แปลง commission row จาก Supabase → format ที่ TeamDashboard ใช้
 */
export function mapCommission(row) {
  const gross = Number(row.total_revenue) || 0
  const teamPool = gross * 0.9
  const companyShare = gross * 0.1
  const partnersTotal = row.commission_partners?.reduce((s, p) => s + Number(p.share_amount || 0), 0) ?? 0

  return {
    id:        row.id,
    title:     row.title,
    talent:    row.talents?.talent_name ?? 'ไม่ระบุ',
    talentId:  row.talent_id,
    owner:     row.owner?.display_name ?? 'ไม่ระบุ',
    ownerId:   row.owner_id,
    category:  'Commission',
    status:    row.status,
    priority:  row.priority,
    startDate: row.start_date,
    endDate:   row.end_date,
    revenue:   gross,
    teamPool,
    companyShare,
    myShare:   Math.max(0, teamPool - partnersTotal),
    partners:  row.commission_partners?.map(p => ({
      name:   p.profiles?.display_name ?? 'Unknown',
      userId: p.profiles?.id,
      amount: Number(p.share_amount || 0),
    })) ?? [],
  }
}

/**
 * แปลง stream row จาก Supabase → format ที่ TeamDashboard ใช้
 */
export function mapStream(row) {
  return {
    id:             row.id,
    title:          row.title,
    talent:         row.talents?.talent_name ?? 'ไม่ระบุ',
    talentId:       row.talent_id,
    createdBy:      row.created_by,
    date:           row.stream_date,
    time:           row.start_time?.slice(0, 5) ?? '',
    endTime:        row.end_time?.slice(0, 5) ?? '',
    platform:       row.platform,
    status:         row.status,
    needsThumbnail: row.needs_thumbnail,
    thumbnailDone:  row.thumbnail_done,
    revenue:        Number(row.revenue),
  }
}

/**
 * แปลง clip row จาก Supabase → format ที่ TeamDashboard ใช้
 */
export function mapClip(row) {
  return {
    id:             row.id,
    idea:           `[${row.format === 'Short' ? 'คลิปสั้น' : 'คลิปยาว'}] ${row.idea_title}`,
    ideaTitle:      row.idea_title,
    talent:         row.talents?.talent_name ?? 'ไม่ระบุ',
    talentId:       row.talent_id,
    createdBy:      row.created_by,
    date:           row.publish_date ?? '',
    format:         row.format,
    status:         row.status,
    needsScript:    row.needs_script,
    scriptDone:     row.script_done,
    needsThumbnail: row.needs_thumbnail,
    thumbnailDone:  row.thumbnail_done,
  }
}
