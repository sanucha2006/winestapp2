import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

/**
 * ออบเจกต์ไคลเอนต์ของ Supabase (Supabase Client Instance)
 * ใช้สำหรับติดต่อสื่อสารกับฐานข้อมูล, บริการ Authentication และ Storage ของ Supabase
 * โดยมีการตรวจทาน Environment Variables ก่อนที่จะทำการสร้าง Client
 * 
 * TODO: Bug Risk - หากไฟล์ .env ใน Production ขาดค่า VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY 
 * ตัวแอปพลิเคชันจะแครชและไม่สามารถรันต่อได้เลย (Fail-Fast)
 * 
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
export const supabase = createClient(supabaseUrl, supabaseKey)