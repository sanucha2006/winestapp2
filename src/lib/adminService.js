// src/lib/adminService.js
// ─────────────────────────────────────────────────────────────
// Admin-specific service layer
// ดึงข้อมูลและ RPC calls สำหรับ Admin Dashboard เท่านั้น
// ─────────────────────────────────────────────────────────────
import { supabase } from './supabaseClient'

// ══════════════════════════════════════════════════════════════
// 📊 ADMIN OVERSIGHT METRICS
// ══════════════════════════════════════════════════════════════

/**
 * ดึงข้อมูล Quest Transactions ทั้งหมดของเดือน (สำหรับใช้นำไปคำนวณ Local Filtering)
 *
 * @param {string} month - เดือนที่ต้องการดึงข้อมูล รูปแบบ YYYY-MM
 * @returns {Promise<Array<Object>>} รายการ quest transaction ของเดือนที่ระบุ
 */
export async function getMonthlyQuests(month) {
  if (!month) return []
  const [y, m] = month.split('-').map(Number)
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const nextMonth = new Date(y, m, 1)
  const end = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`
  
  const { data, error } = await supabase
    .from('talent_quest_transactions')
    .select('is_done, talent_id')
    .gte('assigned_date', start)
    .lt('assigned_date', end)
    
  if (error) throw error
  return data ?? []
}

// ══════════════════════════════════════════════════════════════
// 📋 QUEST MANAGEMENT (Admin)
// ══════════════════════════════════════════════════════════════

/**
 * ดึงรายการ Quest ทั้งหมดในระบบ (Master Quest List)
 *
 * @param {void} ไม่มี parameter
 * @returns {Promise<Array<Object>>} รายการ Quest ทั้งหมด
 */
export async function getAllQuests() {
  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * สร้าง Quest ใหม่ในระบบ
 *
 * @param {Object} payload - ข้อมูล Quest ที่ต้องการสร้าง
 * @param {string} payload.title - ชื่อ Quest
 * @param {string} [payload.description] - รายละเอียดเพิ่มเติมของ Quest
 * @param {'daily'|'weekly'|'monthly'} payload.frequency - ความถี่ของ Quest
 * @param {'short_video'|'livestream'} payload.targetType - ประเภทเป้าหมายของ Quest
 * @param {number} payload.targetValue - จำนวนเป้าหมายที่ต้องทำให้ครบ
 * @param {number} payload.rewardStars - จำนวนดาวรางวัลเมื่อทำสำเร็จ
 * @returns {Promise<Object>} Quest ที่สร้างแล้ว
 */
export async function createQuest({ title, description, frequency, targetType, targetValue, rewardStars }) {
  const { data, error } = await supabase
    .from('quests')
    .insert({
      title,
      description:  description || null,
      frequency,
      target_type:  targetType,
      target_value: targetValue,
      reward_stars: rewardStars,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * มอบหมาย Quest ให้ VTuber (แบบรายบุคคลหรือหลายคน)
 *
 * @param {number} questId - ไอดีของ Quest
 * @param {number[]} talentIds - ไอดี VTuber ที่ต้องการมอบหมาย
 * @param {string} assignedDate - วันที่มอบหมาย 'YYYY-MM-DD'
 * @returns {Promise<void>}
 */
export async function assignQuestToTalents(questId, talentIds, assignedDate) {
  const rows = talentIds.map(talentId => ({
    quest_id:      questId,
    talent_id:     talentId,
    assigned_date: assignedDate,
    current_value: 0,
    is_done:       false,
  }))
  const { error } = await supabase
    .from('talent_quest_transactions')
    .insert(rows)
  if (error) throw error
}

/**
 * ดึงรายการ Quest Transactions ที่ยังอยู่ระหว่างดำเนินการ สำหรับ Admin Verification Grid
 *
 * @param {void} ไม่มี parameter
 * @returns {Promise<Array<Object>>} รายการ transaction พร้อม quest และ talent info
 */
export async function getInProgressQuestTransactions() {
  const { data, error } = await supabase
    .from('talent_quest_transactions')
    .select(`
      id,
      current_value,
      is_done,
      assigned_date,
      talent_id,
      talents ( id, talent_name ),
      quests (
        id, title, frequency, target_type, target_value, reward_stars
      )
    `)
    .eq('is_done', false)
    .order('assigned_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Force Verify Quest — Admin สั่ง RPC submit_and_verify_quest โดยตรง
 *
 * @param {number} transactionId - talent_quest_transactions.id
 * @param {number} talentId - talents.id
 * @returns {Promise<Object|null>} { is_success, status_message, updated_value, final_status }
 */
export async function adminForceVerifyQuest(transactionId, talentId) {
  const { data, error } = await supabase.rpc('submit_and_verify_quest', {
    p_transaction_id: transactionId,
    p_talent_id:      talentId,
  })
  if (error) throw error
  return data?.[0] ?? null
}

// ══════════════════════════════════════════════════════════════
// 💰 FINANCE & REVENUE (Admin)
// ══════════════════════════════════════════════════════════════

/**
 * ดึงข้อมูลการเงิน (Billing Records) ทั้งหมด เพื่อใช้ทำ Local Filtering ฝั่ง Client
 *
 * @param {void} ไม่มี parameter
 * @returns {Promise<Array<Object>>} รายการ billing records ทั้งหมดพร้อมข้อมูล talent
 */
export async function getAllBillingRecords() {
  const { data, error } = await supabase
    .from('billing_records')
    .select(`
      talent_id,
      period,
      superchat,
      merch,
      agency_cut,
      talent_cut,
      status,
      talents ( id, talent_name )
    `)
    .order('period', { ascending: false })

  if (error) throw error
  return data ?? []
}

// ══════════════════════════════════════════════════════════════
// 👥 TEAM WORKLOAD METRICS (Admin)
// ══════════════════════════════════════════════════════════════

/**
 * ดึงข้อมูล Workload ของ Team Member นับจากจำนวน commission ที่รับผิดชอบ
 *
 * @param {string|null} [memberId] - UUID ของ team member (null = ทั้งหมด)
 * @returns {Promise<Object>} { activeProjects, totalCommissions, pendingCount, inProgressCount }
 */
export async function getTeamMemberWorkload(memberId = null) {
  let query = supabase
    .from('commissions')
    .select('id, status, owner_id')
    .neq('status', 'cancelled')

  if (memberId) query = query.eq('owner_id', memberId)

  const { data, error } = await query
  if (error) throw error

  const rows = data ?? []
  return {
    totalCommissions: rows.length,
    activeProjects:   rows.filter(r => r.status !== 'done').length,
    pendingCount:     rows.filter(r => r.status === 'pending').length,
    inProgressCount:  rows.filter(r => r.status === 'in_progress').length,
  }
}
