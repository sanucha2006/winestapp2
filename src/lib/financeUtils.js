// src/lib/financeUtils.js
// ─────────────────────────────────────────────────────────────
// ฟังก์ชันช่วยเหลือในการคำนวณด้านการเงิน ส่วนแบ่งคอมมิชชัน และรายได้จากสตรีม
// ─────────────────────────────────────────────────────────────

/**
 * คำนวณรายได้ส่วนแบ่งทางธุรกิจประเภทคอมมิชชัน (Commission Financials)
 * แบ่งสัดส่วนเป็น: บริษัท 10%, กองกลางของทีม 90%, และนำกองกลางทีมมาแบ่งให้พาร์ทเนอร์
 * ก่อนจะสรุปเป็นส่วนแบ่งคงเหลือของผู้จัดการหลัก (Owner Share)
 * 
 * TODO: Bug Risk - การคำนวณค่าคอมมิชชันด้วย floating-point ดิบ (เช่น gross * 0.1 หรือ gross * 0.9) 
 * อาจนำไปสู่ค่าทศนิยมไม่รู้จบใน JavaScript ได้ ควรทำการปัดเศษ หรือใช้ฟังก์ชันปัดทศนิยมก่อนนำไปเรนเดอร์ใน UI
 * 
 * @param {Object} taskOrDraft - ข้อมูลคอมมิชชันหรือร่างแผนงานคอมมิชชัน
 * @param {number|string} [taskOrDraft.revenue] - รายได้ทั้งหมด
 * @param {number|string} [taskOrDraft.totalRevenue] - รายได้รวมทางเลือก
 * @param {number|string} [taskOrDraft.total_revenue] - รายได้รวมทางเลือกตามตาราง DB
 * @param {Array<Object>} [taskOrDraft.partners] - รายชื่อพาร์ทเนอร์และส่วนแบ่งของแต่ละคน
 * @param {number|string} taskOrDraft.partners[].amount - จำนวนเงินส่วนแบ่งของพาร์ทเนอร์
 * @returns {{ gross: number, companyShare: number, teamPool: number, ownerShare: number, partnersTotal: number }} ผลลัพธ์การคำนวณส่วนแบ่งการเงิน
 */
export function getCommissionFinancials(taskOrDraft) {
  const gross = Number(taskOrDraft.revenue ?? taskOrDraft.totalRevenue ?? taskOrDraft.total_revenue ?? 0) || 0
  const partners = taskOrDraft.partners ?? []
  const companyShare = gross * 0.1
  const teamPool = gross * 0.9
  const partnersTotal = partners.reduce((sum, partner) => sum + (Number(partner.amount) || 0), 0)
  const ownerShare = Math.max(0, teamPool - partnersTotal)

  return { gross, companyShare, teamPool, ownerShare, partnersTotal }
}

/**
 * คำนวณรายได้ส่วนแบ่งสตรีม (Stream Financials)
 * แบ่งสัดส่วนคงที่คือ: บริษัท 60% และ วีทูเบอร์ผู้สตรีม (Talent) 40%
 * 
 * TODO: Bug Risk - ปัญหาความแม่นยำทศนิยมของ JavaScript (Floating-point precision) 
 * ควรใช้เมธอดปัดเศษหรือฟอร์แมตตัวเลขก่อนส่งขึ้นแสดงใน UI ป้องกันตัวเลขทศนิยมไม่พึงประสงค์
 * 
 * @param {Object} stream - ข้อมูลสตรีม
 * @param {number|string} [stream.revenue] - รายได้จากสตรีมนั้น ๆ
 * @returns {{ gross: number, companyShare: number, talentShare: number }} ผลลัพธ์การคำนวณส่วนแบ่งการเงินของสตรีม
 */
export function getStreamFinancials(stream) {
  const gross = Number(stream.revenue) || 0
  return {
    gross,
    companyShare: gross * 0.6,
    talentShare: gross * 0.4,
  }
}
