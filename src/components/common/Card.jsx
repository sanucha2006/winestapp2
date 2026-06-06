/**
 * คอมโพเนนต์การ์ดส่วนกลาง (Common Card Component)
 * ใช้เป็นตู้คอนเทนเนอร์แสดงผลข้อมูลที่มีธีมสีพื้นหลัง Obsidian Deep และขอบกระจกใสบางเบา (Glass-like Border)
 * 
 * @param {Object} props - คุณสมบัติที่ส่งเข้ามายัง component
 * @param {React.ReactNode} props.children - เนื้อหาหรือคอมโพเนนต์ลูกที่จะแสดงภายในการ์ด
 * @param {string} [props.className] - ชื่อคลาส CSS เพิ่มเติมสำหรับปรับแต่งสไตล์การแสดงผลของการ์ด
 * @returns {React.ReactElement} กล่องการ์ดสำหรับใส่ข้อมูล
 */
export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-[#0f0f17] border border-white/[0.05] rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  )
}
