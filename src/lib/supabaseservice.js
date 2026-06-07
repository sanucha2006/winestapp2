// src/lib/supabaseService.js
// ─────────────────────────────────────────────────────────────
// Central service layer — ทุก component ดึงข้อมูลผ่านไฟล์นี้
// ไม่ query Supabase ตรงใน component เพื่อง่ายต่อการดูแล
// ─────────────────────────────────────────────────────────────
import { supabase } from './supabaseClient'

/**
 * [Internal Helper] แปลงรูปแบบเดือน 'YYYY-MM' ให้เป็นช่วงของวันแรกในเดือนนั้นและวันแรกในเดือนถัดไป (ISO date string)
 * ใช้ใน getStreams และ getClips เพื่อกรองข้อมูลตามเดือน
 * 
 * @param {string} month - ค่าเดือนในรูปแบบ 'YYYY-MM'
 * @returns {{ start: string, end: string }} ช่วงเวลาเริ่มต้นและสิ้นสุดของเดือน
 */
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

/**
 * ดึงข้อมูลโปรไฟล์และบทบาท (Profile + Role) ของผู้ใช้งานที่ระบุ
 * 
 * @param {string} userId - ไอดีผู้ใช้งาน (UUID) จากตาราง profiles
 * @returns {Promise<Object>} ข้อมูลโปรไฟล์ผู้ใช้งาน
 */
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

/**
 * ดึงรายชื่อนักพากย์/วีทูเบอร์ (Talents) ทั้งหมดที่มีสถานะ Active ในระบบ
 * 
 * @param {void} ไม่มี parameter
 * @returns {Promise<Array<Object>>} รายชื่อวีทูเบอร์ [{ id, user_id, talent_name }]
 */
export async function getTalents() {
  const { data, error } = await supabase
    .from('talents')
    .select('id, user_id, talent_name')
    .eq('is_active', true)
    .order('talent_name')
  if (error) throw error
  return data // [{ id, user_id, talent_name }]
}

/**
 * ดึงข้อมูลโปรไฟล์ Talent ของตัวเองด้วย user_id (ใช้สำหรับหน้าแดชบอร์ดวีทูเบอร์)
 * คืนค่ากลับเป็น null หากยังไม่ได้ผูกข้อมูลไว้ แทนการแจ้ง Error
 * 
 * @param {string} userId - ไอดีของตาราง auth (user_id ในตาราง talents)
 * @returns {Promise<Object|null>} ข้อมูลโปรไฟล์ของวีทูเบอร์รายนั้น หรือ null หากไม่พบข้อมูล
 */
export async function getMyTalentProfile(userId) {
  const { data, error } = await supabase
    .from('talents')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()          // ✅ return null ถ้าไม่พบ แทนการ throw
  if (error) throw error
  return data               // null | talent object
}

/**
 * ดึงสมาชิกทีม (Staff / Talents / Admin) ทั้งหมดในระบบที่มีสถานะเป็น Active
 * 
 * @param {void} ไม่มี parameter
 * @returns {Promise<Array<Object>>} รายชื่อทีมงานพร้อมบทบาท [{ id, display_name, role }]
 */
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
 * ดึงข้อมูลรายการคอมมิชชันทั้งหมดที่เป็นของตนเอง หรือมีชื่อตนเองเข้าร่วมเป็นพาร์ทเนอร์
 * 
 * @param {string} ownerId - ไอดีของทีมงานผู้สร้างหรือที่เป็นพาร์ทเนอร์ (UUID)
 * @returns {Promise<Array<Object>>} ข้อมูลรายการคอมมิชชันและผู้เกี่ยวข้อง
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

/**
 * สร้างข้อมูลคอมมิชชันชิ้นใหม่ พร้อมทั้งระบุพาร์ทเนอร์ที่ได้รับส่วนแบ่ง
 * 
 * TODO: Bug Risk - ใน createCommission ไม่ได้ทำธุรกรรมแบบอะตอมมิก (Database Transaction) 
 * หากการสร้างบันทึกหลักคอมมิชชันสำเร็จ แต่การใส่ข้อมูลพาร์ทเนอร์ล้มเหลว ข้อมูลจะเกิดความไม่สอดคล้อง (Inconsistent State)
 * 
 * @param {Object} payload - ข้อมูลคอมมิชชันที่ส่งเข้ามาสร้าง
 * @param {string} payload.title - หัวข้อคอมมิชชัน
 * @param {string} payload.ownerId - ไอดีเจ้าของงาน/ผู้รับผิดชอบหลัก
 * @param {number} payload.talentId - ไอดีผู้สร้างสรรค์งาน (Talents)
 * @param {string} payload.priority - ระดับความสำคัญ
 * @param {string} payload.startDate - วันเริ่มงาน
 * @param {string} payload.endDate - วันสิ้นสุดงาน
 * @param {number} payload.totalRevenue - รายได้ทั้งหมดของคอมมิชชัน
 * @param {string} payload.description - รายละเอียดเพิ่มเติม
 * @param {Array<Object>} payload.partners - รายการพาร์ทเนอร์ร่วมรับส่วนแบ่ง
 * @returns {Promise<Object>} ข้อมูลคอมมิชชันที่ถูกสร้างขึ้น
 */
export async function createCommission({ title, ownerId, talentId, priority, startDate, endDate, totalRevenue, description, partners }) {
  // 1. Insert commission
  const { data: comm, error: commErr } = await supabase
    .from('commissions')
    .insert({
      title,
      owner_id:      ownerId,
      talent_id:     talentId || null,
      status:        'pending',
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

/**
 * อัปเดตสถานะของคอมมิชชัน (เช่น pending, approved, paid)
 * 
 * @param {number} id - ไอดีของคอมมิชชัน
 * @param {string} status - สถานะที่ต้องการปรับเปลี่ยน
 * @returns {Promise<void>}
 */
export async function updateCommissionStatus(id, status) {
  const { error } = await supabase
    .from('commissions')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

/**
 * ลบข้อมูลรายการคอมมิชชันออกจากระบบ
 * 
 * @param {number} id - ไอดีของคอมมิชชันที่ต้องการลบ
 * @returns {Promise<void>}
 */
export async function deleteCommission(id) {
  const { error } = await supabase
    .from('commissions')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/**
 * [Admin Only] ดึง Commission ทั้งหมดในระบบโดยไม่กรองตาม owner
 * ใช้สำหรับ Admin Dashboard เพื่อเห็น Commission ของ VTuber ทุกคน
 *
 * @param {Object} [options]
 * @param {string} [options.month] - กรองตามเดือน 'YYYY-MM' (ดู start_date ของ commission)
 * @returns {Promise<Array<Object>>} รายการ Commission ทั้งหมดพร้อม talent, owner, และ partners
 */
export async function getAllCommissions({ month } = {}) {
  let query = supabase
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
    .order('created_at', { ascending: false })

  if (month) {
    const [year, monthNumber] = month.split('-').map(Number)
    const start = `${year}-${String(monthNumber).padStart(2, '0')}-01`
    const nextMonthDate = new Date(year, monthNumber, 1)
    const end = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`
    query = query.gte('start_date', start).lt('start_date', end)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

// ══════════════════════════════════════════════════════════════
// 📺 STREAMS
// ══════════════════════════════════════════════════════════════

/**
 * ดึงรายการสตรีมทั้งหมดตามการกรองด้วย ID วีทูเบอร์ หรือ เดือน
 * 
 * @param {Object} [options] - ออปชันสำหรับการกรอง
 * @param {number} [options.talentId] - ไอดีของวีทูเบอร์
 * @param {string} [options.month] - เดือนในรูปแบบ 'YYYY-MM'
 * @returns {Promise<Array<Object>>} รายชื่อสตรีมที่ค้นพบ
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

/**
 * เพิ่มรายการสตรีมใหม่ลงในระบบ
 * 
 * @param {Object} payload - ข้อมูลรายการสตรีมใหม่
 * @param {number} payload.talentId - ไอดีวีทูเบอร์เจ้าของช่องสตรีม
 * @param {string} payload.createdBy - ไอดีผู้บันทึกรายการ (UUID)
 * @param {string} payload.title - หัวข้อ/ชื่อสตรีม
 * @param {string} payload.streamDate - วันที่ทำสตรีม (YYYY-MM-DD)
 * @param {string} [payload.startTime] - เวลาเริ่มต้นสตรีม
 * @param {string} [payload.platform] - แพลตฟอร์มที่สตรีม (ค่าเริ่มต้น YouTube)
 * @param {boolean} payload.needsThumbnail - ระบุว่าต้องทำปกสตรีม (Thumbnail) หรือไม่
 * @returns {Promise<Object>} ข้อมูลสตรีมที่ถูกเพิ่ม
 */
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
      status:          'pending',
      needs_thumbnail: needsThumbnail,
      thumbnail_done:  !needsThumbnail,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * สลับสถานะของปกสตรีม (ทำเสร็จแล้ว / ยังไม่เสร็จ)
 * 
 * @param {number} id - ไอดีของสตรีม
 * @param {boolean} currentValue - สถานะปัจจุบันของ thumbnail_done
 * @returns {Promise<void>}
 */
export async function toggleStreamThumbnail(id, currentValue) {
  const { error } = await supabase
    .from('streams')
    .update({ thumbnail_done: !currentValue })
    .eq('id', id)
  if (error) throw error
}

/**
 * บันทึกการสิ้นสุดสตรีม พร้อมระบุเวลาสิ้นสุดและรายได้ที่เกิดขึ้น
 * 
 * @param {number} id - ไอดีของสตรีม
 * @param {Object} payload - ข้อมูลตอนจบสตรีม
 * @param {string} payload.endTime - เวลาที่สิ้นสุดสตรีม
 * @param {number} payload.revenue - รายได้รวมสตรีม (บาท)
 * @returns {Promise<void>}
 */
export async function endStream(id, { endTime, revenue }) {
  const { error } = await supabase
    .from('streams')
    .update({ status: 'done', end_time: endTime, revenue })
    .eq('id', id)
  if (error) throw error
}

/**
 * ลบรายการสตรีมออกจากระบบ
 * 
 * @param {number} id - ไอดีของสตรีมที่ต้องการลบ
 * @returns {Promise<void>}
 */
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
 * ดึงรายการไฮไลท์/คลิปสั้น (Clips) ทั้งหมดตามการกรอง
 * 
 * @param {Object} [options] - ออปชันสำหรับการกรอง
 * @param {number} [options.talentId] - ไอดีของวีทูเบอร์
 * @param {string} [options.month] - เดือนในรูปแบบ 'YYYY-MM'
 * @returns {Promise<Array<Object>>} รายการคลิปสั้น/ยาวที่ดึงมาได้
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

/**
 * เพิ่มรายการวิดีโอ/คลิปใหม่ลงระบบแผนงาน
 * 
 * @param {Object} payload - ข้อมูลวิดีโอ/คลิปใหม่
 * @param {number} payload.talentId - ไอดีวีทูเบอร์เจ้าของคลิป
 * @param {string} payload.createdBy - ไอดีของทีมงานผู้สร้างไอเดีย (UUID)
 * @param {string} payload.ideaTitle - หัวข้อ/ไอเดียของคลิป
 * @param {string} [payload.publishDate] - วันที่วางแผนจะลงคลิป (YYYY-MM-DD)
 * @param {string} [payload.format] - รูปแบบคลิป เช่น 'Short' หรือ 'Long'
 * @param {boolean} payload.needsScript - ระบุว่าจำเป็นต้องเขียนบท (Script) หรือไม่
 * @param {boolean} payload.needsThumbnail - ระบุว่าต้องการปกคลิป (Thumbnail) หรือไม่
 * @returns {Promise<Object>} รายละเอียดคลิปที่ถูกบันทึก
 */
export async function createClip({ talentId, createdBy, ideaTitle, publishDate, format, needsScript, needsThumbnail }) {
  const { data, error } = await supabase
    .from('clips')
    .insert({
      talent_id:       talentId,
      created_by:      createdBy || null,
      idea_title:      ideaTitle,
      publish_date:    publishDate || null,
      format:          format || 'Short',
      status:          'pending',
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

/**
 * สลับสถานะของบทวิดีโอ (เขียนบทเสร็จแล้ว / ยังไม่เสร็จ)
 * 
 * @param {number} id - ไอดีของคลิป
 * @param {boolean} currentValue - สถานะบทปัจจุบัน
 * @returns {Promise<void>}
 */
export async function toggleClipScript(id, currentValue) {
  const { error } = await supabase
    .from('clips')
    .update({ script_done: !currentValue })
    .eq('id', id)
  if (error) throw error
}

/**
 * สลับสถานะของปกวิดีโอ (ทำปกเสร็จแล้ว / ยังไม่เสร็จ)
 * 
 * @param {number} id - ไอดีของคลิป
 * @param {boolean} currentValue - สถานะปกปัจจุบัน
 * @returns {Promise<void>}
 */
export async function toggleClipThumbnail(id, currentValue) {
  const { error } = await supabase
    .from('clips')
    .update({ thumbnail_done: !currentValue })
    .eq('id', id)
  if (error) throw error
}

/**
 * อัปเดตสถานะของคลิป (เช่น pending, editing, done)
 * 
 * @param {number} id - ไอดีของคลิป
 * @param {string} status - สถานะใหม่ที่ต้องการตั้ง
 * @returns {Promise<void>}
 */
export async function updateClipStatus(id, status) {
  const { error } = await supabase
    .from('clips')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

/**
 * ลบรายการคลิปออกจากระบบ
 * 
 * @param {number} id - ไอดีของคลิปที่ต้องการลบ
 * @returns {Promise<void>}
 */
export async function deleteClip(id) {
  const { error } = await supabase
    .from('clips')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ══════════════════════════════════════════════════════════════
// 🎯 QUESTS & QUEST TRANSACTIONS
// ══════════════════════════════════════════════════════════════

/**
 * ดึงรายการภารกิจ (Quest Transactions) ทั้งหมดที่มอบหมายให้วีทูเบอร์
 * 
 * @param {number} talentId - ไอดีของวีทูเบอร์
 * @returns {Promise<Array<Object>>} รายชื่อภารกิจที่พบพร้อมรายละเอียดเควส
 */
export async function getQuestTransactions(talentId) {
  const { data, error } = await supabase
    .from('talent_quest_transactions')
    .select(`
      id,
      current_value,
      is_done,
      assigned_date,
      completed_at,
      created_at,
      quests (
        id,
        title,
        description,
        frequency,
        target_type,
        target_value,
        reward_stars
      )
    `)
    .eq('talent_id', talentId)
    .order('assigned_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * เรียก Supabase RPC ฟังก์ชัน submit_and_verify_quest เพื่อตรวจสอบความก้าวหน้าจริงจากกิจกรรม (สตรีม/คลิป)
 * และคำนวณแจกรางวัลเป็นแต้มดาว (Stars)
 * 
 * @param {number} transactionId - ไอดีของรายการธุรกรรมเควส (talent_quest_transactions.id)
 * @param {number} talentId - ไอดีของวีทูเบอร์ (talents.id)
 * @returns {Promise<Object|null>} ผลลัพธ์ยืนยันเควส { is_success, status_message, updated_value, final_status }
 */
export async function submitQuest(transactionId, talentId) {
  const { data, error } = await supabase.rpc('submit_and_verify_quest', {
    p_transaction_id: transactionId,
    p_talent_id: talentId,
  })
  if (error) throw error
  // RPC RETURNS TABLE → Supabase JS คืนเป็น array (row แรกคือผลลัพธ์)
  return data?.[0] ?? null
}

/**
 * ดึงคะแนนดาวสะสมล่าสุด (Stars) ของวีทูเบอร์
 * 
 * @param {number} talentId - ไอดีของวีทูเบอร์
 * @returns {Promise<number>} จำนวนดาวปัจจุบัน
 */
export async function getTalentStars(talentId) {
  const { data, error } = await supabase
    .from('talents')
    .select('stars')
    .eq('id', talentId)
    .single()
  if (error) throw error
  return data?.stars ?? 0
}

// ══════════════════════════════════════════════════════════════
// 💰 BILLING RECORDS (Admin)
// ══════════════════════════════════════════════════════════════

/**
 * ดึงรายการรอบบัญชีและการจ่ายเงิน (Billing Records) ทั้งหมดในระบบ
 * 
 * @param {void} ไม่มี parameter
 * @returns {Promise<Array<Object>>} รายการบัญชีบิลดิ้งพร้อมชื่อ Talent
 */
export async function getBillingRecords() {
  const { data, error } = await supabase
    .from('billing_records')
    .select(`*, talents ( id, talent_name )`)
    .order('period', { ascending: false })
  if (error) throw error
  return data
}

/**
 * อัปเดตสถานะการชำระเงินของบิล (เช่น unpaid, paid)
 * 
 * @param {number} id - ไอดีของรายการ billing_records
 * @param {string} status - สถานะการชำระเงินใหม่
 * @returns {Promise<void>}
 */
export async function updateBillingStatus(id, status) {
  const { error } = await supabase
    .from('billing_records')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

/**
 * ดึงรายการบิลการชำระเงินทั้งหมดของวีทูเบอร์ที่ระบุ
 * 
 * @param {number} talentId - ไอดีของวีทูเบอร์
 * @returns {Promise<Array<Object>>} รายชื่อรายการบิลของวีทูเบอร์รายนั้น
 */
export async function getTalentBilling(talentId) {
  const { data, error } = await supabase
    .from('billing_records')
    .select('*')
    .eq('talent_id', talentId)
    .order('period', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ══════════════════════════════════════════════════════════════
// 🔧 UTILITY: แปลง Supabase row → format ที่ component ใช้
// ══════════════════════════════════════════════════════════════

/**
 * แปลงโครงสร้างแถวข้อมูล Commission จาก Supabase ให้อยู่ในฟอร์แมตที่หน้าแดชบอร์ดทีม (TeamDashboard) ใช้งาน
 * ทำการคำนวณสัดส่วนรายได้ ส่วนแบ่งบริษัท ส่วนแบ่งทีม และส่วนแบ่งของตัวเอง
 * 
 * @param {Object} row - ข้อมูลแถว Commission ดิบจากฐานข้อมูล
 * @returns {Object} ข้อมูล Commission ที่แปลงโครงสร้างและคำนวณรายได้เสร็จเรียบร้อยแล้ว
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
 * แปลงโครงสร้างแถวข้อมูล Stream จาก Supabase ให้พร้อมใช้งานในแดชบอร์ด
 * 
 * @param {Object} row - ข้อมูลแถวสตรีมดิบจากฐานข้อมูล
 * @returns {Object} ข้อมูลสตรีมที่มีข้อมูลครบถ้วนสำหรับ UI
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
 * แปลงโครงสร้างแถวข้อมูล Clip จาก Supabase ให้สอดคล้องกับการแสดงผลบน UI แดชบอร์ด
 * 
 * @param {Object} row - ข้อมูลแถววิดีโอคลิปดิบจากฐานข้อมูล
 * @returns {Object} ข้อมูลวิดีโอคลิปที่ฟอร์แมตแล้ว
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

// ══════════════════════════════════════════════════════════════
// 📅 VTUBER AVAILABILITY
// ══════════════════════════════════════════════════════════════

/**
 * ดึงลิสต์วันว่างของวีทูเบอร์ประจำปีและเดือนที่กำหนด
 * 
 * @param {string} vtuberUserId - ไอดีระดับผู้ใช้ (User ID ของวีทูเบอร์เป็น UUID)
 * @param {number} year - ปี ค.ศ.
 * @param {number} month - เดือน 1-12
 * @returns {Promise<Array<number>>} รายการวันที่ระบุว่าว่าง (เช่น [2, 5, 15])
 */
export async function getVTuberAvailability(vtuberUserId, year, month) {
  const { data, error } = await supabase
    .from('vtuber_availability')
    .select('*')
    .eq('vtuber_id', vtuberUserId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()
  if (error) throw error
  return data ? data.available_days : [] // return [] ถ้าไม่มีข้อมูล
}

/**
 * บันทึก หรือ ปรับปรุง (Upsert) วันว่างของวีทูเบอร์ประจำปีและเดือนนั้น ๆ
 * 
 * @param {string} vtuberUserId - ไอดีระดับผู้ใช้ (User ID ของวีทูเบอร์เป็น UUID)
 * @param {number} year - ปี ค.ศ.
 * @param {number} month - เดือน 1-12
 * @param {Array<number>} availableDays - ลิสต์ตัวเลขของวันที่ระบุว่าว่าง
 * @returns {Promise<void>}
 */
export async function upsertVTuberAvailability(vtuberUserId, year, month, availableDays) {
  const { error } = await supabase
    .from('vtuber_availability')
    .upsert(
      {
        vtuber_id:     vtuberUserId,
        year,
        month,
        available_days: availableDays, // INTEGER[] ใน PostgreSQL
      },
      {
        onConflict: 'vtuber_id,year,month', // Composite unique key
      }
    )
  if (error) throw error
}
