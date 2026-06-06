/**
 * คอมโพเนนต์โครงร่างโหลดข้อมูลชั่วคราว (Skeleton Loading Component)
 * แสดงรูปทรงกล่องสีเทาจางกะพริบ (pulse animation) เพื่อแสดงเป็นโครงสร้างจำลองระหว่างที่ระบบกำลังโหลดข้อมูลจริง
 * 
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {string} [props.className] - ชื่อคลาส CSS เพิ่มเติมเพื่อกำหนดขนาด (เช่น w-full, h-4) หรือรูปทรง (เช่น rounded-full) ของกล่อง
 * @returns {React.ReactElement} โครงร่างแสดงสถานะกำลังโหลด
 */
export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/[0.04] rounded-lg ${className}`} />
}
