import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/**
 * จุดเริ่มต้นหลัก (Entry Point) ของแอปพลิเคชัน React
 * ทำหน้าที่เมาท์ (mount) คอมโพเนนต์ App เข้ากับ DOM node ที่มี id เป็น 'root'
 * ภายใต้ StrictMode เพื่อช่วยในการตรวจสอบปัญหาที่อาจเกิดขึ้นในแอปพลิเคชัน
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
