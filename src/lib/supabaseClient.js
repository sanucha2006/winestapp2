import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://brdvzyayecdahuzrkhxn.supabase.co'
const supabaseAnonKey = 'sb_publishable_NGbaavrCEvC79Bmaj-2eIw_Vj3dtvEk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
