-- ══════════════════════════════════════════════════════════════
-- 🛠️ DATABASE SCHEMA (FROM USER EXACT DATA)
-- ══════════════════════════════════════════════════════════════

-- status,	ความหมาย,	ใช้กับ
-- pending,	รอเริ่ม / ยังไม่ได้จัดการ	,commissions, streams, clips, billing
-- in_progress,	กำลังดำเนินการอยู่	,commissions, clips
-- in_review,	รอตรวจ / รออนุมัติ	,commissions, clips
-- done,	เสร็จสมบูรณ์ / เผยแพร่แล้ว / จ่ายแล้ว	,ทุกตาราง
-- cancelled,	ยกเลิก	,ทุกตาราง (สำรองไว้)

create table public.billing_records (
  id serial not null,
  talent_id integer not null,
  period character varying(20) not null,
  superchat numeric null default 0,
  merch numeric null default 0,
  agency_cut numeric null default 0,
  talent_cut numeric null default 0,
  status character varying(20) null default 'Pending'::character varying,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint billing_records_pkey primary key (id),
  constraint billing_records_talent_id_fkey foreign KEY (talent_id) references talents (id)
) TABLESPACE pg_default;

create table public.clips (
  id serial not null,
  talent_id integer not null,
  idea_title text not null,
  publish_date date null,
  format text null default 'Short'::text,
  status character varying(20) null default 'pending'::character varying,
  needs_script boolean null default true,
  script_done boolean null default false,
  needs_thumbnail boolean null default true,
  thumbnail_done boolean null default false,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  created_by uuid null,
  constraint clips_pkey primary key (id),
  constraint clips_created_by_fkey foreign KEY (created_by) references profiles (id) on delete RESTRICT,
  constraint clips_talent_id_fkey foreign KEY (talent_id) references talents (id)
) TABLESPACE pg_default;

create table public.commission_partners (
  id serial not null,
  commission_id integer not null,
  team_member_id uuid not null,
  share_amount numeric null default 0,
  constraint commission_partners_pkey primary key (id),
  constraint commission_partners_commission_id_fkey foreign KEY (commission_id) references commissions (id) on delete CASCADE,
  constraint commission_partners_team_member_id_fkey foreign KEY (team_member_id) references profiles (id)
) TABLESPACE pg_default;

create table public.commissions (
  id serial not null,
  title text not null,
  owner_id uuid not null,
  talent_id integer null,
  status character varying(20) null default 'pending'::character varying,
  priority character varying(20) null default 'Medium'::character varying,
  start_date date null,
  end_date date null,
  total_revenue numeric null default 0,
  description text null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint commissions_pkey primary key (id),
  constraint commissions_owner_id_fkey foreign KEY (owner_id) references profiles (id),
  constraint commissions_talent_id_fkey foreign KEY (talent_id) references talents (id)
) TABLESPACE pg_default;

create table public.profiles (
  id uuid not null,
  email text not null,
  display_name text null,
  role public.user_role_type not null default 'team'::user_role_type,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  is_active boolean null default true,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.quests (
  id serial not null,
  title text not null,
  description text null,
  frequency text not null default 'weekly'::text,
  target_type text not null default 'short_video'::text,
  target_value integer not null default 1,
  reward_stars integer not null default 0,
  created_at timestamp without time zone null default now(),
  constraint quests_pkey primary key (id),
  constraint chk_quest_frequency check (
    (
      frequency = any (
        array['daily'::text, 'weekly'::text, 'monthly'::text]
      )
    )
  ),
  constraint chk_quest_target_type check (
    (
      target_type = any (array['short_video'::text, 'livestream'::text])
    )
  )
) TABLESPACE pg_default;

create table public.streams (
  id serial not null,
  talent_id integer not null,
  title text not null,
  stream_date date not null,
  start_time time without time zone null,
  end_time time without time zone null,
  platform text null default 'YouTube'::text,
  status character varying(20) null default 'pending'::character varying,
  needs_thumbnail boolean null default true,
  thumbnail_done boolean null default false,
  revenue numeric null default 0,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  created_by uuid null,
  constraint streams_pkey primary key (id),
  constraint streams_created_by_fkey foreign KEY (created_by) references profiles (id) on delete RESTRICT,
  constraint streams_talent_id_fkey foreign KEY (talent_id) references talents (id)
) TABLESPACE pg_default;

create table public.talent_quest_transactions (
  id serial not null,
  talent_id integer not null,
  quest_id integer not null,
  current_value integer not null default 0,
  is_done boolean null default false,
  assigned_date date not null,
  completed_at timestamp without time zone null,
  created_at timestamp without time zone null default now(),
  constraint talent_quest_transactions_pkey primary key (id),
  constraint tq_trans_quest_id_fkey foreign KEY (quest_id) references quests (id) on delete CASCADE,
  constraint tq_trans_talent_id_fkey foreign KEY (talent_id) references talents (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_tq_transactions_search on public.talent_quest_transactions using btree (talent_id, assigned_date) TABLESPACE pg_default;

create table public.talents (
  id serial not null,
  user_id uuid null,
  talent_name text not null,
  is_active boolean null default true,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  stars integer not null default 0,
  constraint talents_pkey primary key (id),
  constraint talents_user_id_unique unique (user_id),
  constraint talents_user_id_fkey foreign KEY (user_id) references profiles (id)
) TABLESPACE pg_default;

-- PROFILES
create policy "Allow authenticated select profiles"
on public.profiles
for select
to authenticated
using (true);

-- TALENTS
create policy "Allow authenticated select talents"
on public.talents
for select
to authenticated
using (true);

-- COMMISSIONS
create policy "Allow authenticated select commissions"
on public.commissions
for select
to authenticated
using (true);

create policy "Allow authenticated insert commissions"
on public.commissions
for insert
to authenticated
with check (true);

create policy "Allow authenticated update commissions"
on public.commissions
for update
to authenticated
using (true)
with check (true);

create policy "Allow authenticated delete commissions"
on public.commissions
for delete
to authenticated
using (true);

-- COMMISSION PARTNERS
create policy "Allow authenticated select commission partners"
on public.commission_partners
for select
to authenticated
using (true);

create policy "Allow authenticated insert commission partners"
on public.commission_partners
for insert
to authenticated
with check (true);

create policy "Allow authenticated update commission partners"
on public.commission_partners
for update
to authenticated
using (true)
with check (true);

create policy "Allow authenticated delete commission partners"
on public.commission_partners
for delete
to authenticated
using (true);

-- STREAMS
create policy "Allow authenticated select streams"
on public.streams
for select
to authenticated
using (true);

create policy "Allow authenticated insert streams"
on public.streams
for insert
to authenticated
with check (true);

create policy "Allow authenticated update streams"
on public.streams
for update
to authenticated
using (true)
with check (true);

create policy "Allow authenticated delete streams"
on public.streams
for delete
to authenticated
using (true);

-- CLIPS
create policy "Allow authenticated select clips"
on public.clips
for select
to authenticated
using (true);

create policy "Allow authenticated insert clips"
on public.clips
for insert
to authenticated
with check (true);

create policy "Allow authenticated update clips"
on public.clips
for update
to authenticated
using (true)
with check (true);

create policy "Allow authenticated delete clips"
on public.clips
for delete
to authenticated
using (true);

-- QUESTS
create policy "Allow authenticated select quests"
on public.quests
for select
to authenticated
using (true);

create policy "Allow authenticated insert quests"
on public.quests
for insert
to authenticated
with check (true);

create policy "Allow authenticated update quests"
on public.quests
for update
to authenticated
using (true)
with check (true);

create policy "Allow authenticated delete quests"
on public.quests
for delete
to authenticated
using (true);

-- BILLING RECORDS
create policy "Allow authenticated select billing records"
on public.billing_records
for select
to authenticated
using (true);

create policy "Allow authenticated insert billing records"
on public.billing_records
for insert
to authenticated
with check (true);

create policy "Allow authenticated update billing records"
on public.billing_records
for update
to authenticated
using (true)
with check (true);

create policy "Allow authenticated delete billing records"
on public.billing_records
for delete
to authenticated
using (true);

-- Database Function
CREATE OR REPLACE FUNCTION public.submit_and_verify_quest(
  p_transaction_id INT,
  p_talent_id INT
)
RETURNS TABLE (
  is_success BOOLEAN,
  status_message TEXT,
  updated_value INT,
  final_status BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER -- 🔒 สำคัญมาก: ช่วยให้ฟังก์ชันทำงานข้าม RLS เพื่อไปอัปเดตดาวในตาราง talents ได้
AS $$
DECLARE
  v_quest_id INT;
  v_target_type TEXT;
  v_target_value INT;
  v_reward_stars INT;
  v_assigned_date DATE;
  v_start_date DATE;
  v_end_date DATE;
  v_current_calculated_value INT := 0;
  v_already_done BOOLEAN;
BEGIN
  -- 1. ดึงข้อมูลใบงานภารกิจ (Transaction) และเควสต้นแบบออกมารวมกัน
  SELECT tq.quest_id, q.target_type, q.target_value, q.reward_stars, tq.is_done, tq.assigned_date
  INTO v_quest_id, v_target_type, v_target_value, v_reward_stars, v_already_done, v_assigned_date
  FROM public.talent_quest_transactions tq
  JOIN public.quests q ON tq.quest_id = q.id
  WHERE tq.id = p_transaction_id AND tq.talent_id = p_talent_id;

  -- ตรวจสอบความปลอดภัย: เผื่อไม่พบข้อมูลภารกิจนี้ในระบบ
  IF v_quest_id IS NULL THEN
    RETURN QUERY SELECT false, 'ไม่พบข้อมูลภารกิจนี้ในระบบของคุณ'::TEXT, 0, false;
    RETURN;
  END IF;

  -- ป้องกันการกดซ้ำ: ถ้ารายการนี้เคยทำสำเร็จและรับดาวไปแล้ว ให้ดีดกลับทันที
  IF v_already_done = true THEN
    RETURN QUERY SELECT false, 'ภารกิจนี้ทำสำเร็จและรับรางวัลไปเรียบร้อยแล้วจ้า 🌟'::TEXT, v_target_value, true;
    RETURN;
  END IF;

  -- ⏳ [LOCK TIME WINDOW] กำหนดช่วงเวลาตรวจการบ้านประจำสัปดาห์นั้น ๆ 
  -- อิงจาก assigned_date (วันเริ่ม) ไปจนถึงสิ้นสุดสัปดาห์ (+ 6 วัน) 
  v_start_date := v_assigned_date;
  v_end_date := v_assigned_date + INTERVAL '6 days';

  -- 2. คิวลี่นับสถิติจริงจากตาราง Clips หรือ Streams ตาม Schema เป๊ะ ๆ
  IF v_target_type = 'short_video' THEN
    -- นับจากตาราง public.clips โดยใช้คอลัมน์ publish_date และ status = 'done'
    SELECT COUNT(c.id)::INT INTO v_current_calculated_value
    FROM public.clips c
    WHERE c.talent_id = p_talent_id 
      AND c.status = 'done' 
      AND c.publish_date BETWEEN v_start_date AND v_end_date;
      
  ELSIF v_target_type = 'livestream' THEN
    -- คำนวณชั่วโมงจากตาราง public.streams โดยใช้คอลัมน์ stream_date และคำนวณส่วนต่างระหว่าง start_time และ end_time
    -- 💡 มีการใส่ Logic รองรับกรณี "วีทูเบอร์ไลฟ์สตรีมข้ามเที่ยงคืน" (เช่น เริ่ม 23:00 จบ 02:00) ให้คำนวณเวลาได้ถูกต้อง ไม่ติดลบ
    SELECT COALESCE(
      SUM(
        CASE 
          WHEN s.end_time >= s.start_time THEN EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600
          ELSE EXTRACT(EPOCH FROM ((s.end_time - s.start_time) + INTERVAL '24 hours')) / 3600
        END
      )::INT, 0
    ) INTO v_current_calculated_value
    FROM public.streams s
    WHERE s.talent_id = p_talent_id 
      AND s.status = 'done' 
      AND s.stream_date BETWEEN v_start_date AND v_end_date;
  END IF;

  -- 3. อัปเดตความคืบหน้า (Progress) ล่าสุดที่คำนวณได้กลับลงไปในใบงานภารกิจ
  UPDATE public.talent_quest_transactions
  SET current_value = v_current_calculated_value
  WHERE id = p_transaction_id;

  -- 4. ตรวจสอบว่าความคืบหน้าถึงเป้าหมาย (target_value) แล้วหรือยัง?
  IF v_current_calculated_value >= v_target_value THEN
    -- 🎉 ผ่านเกณฑ์! ปรับสถานะใบงานเป็นเสร็จสมบูรณ์
    UPDATE public.talent_quest_transactions
    SET is_done = true,
        completed_at = NOW()
    WHERE id = p_transaction_id;

    -- 🌟 แจกคอยน์ดาวเพิ่มเข้าไปในกระเป๋าของวีทูเบอร์คนนั้นในตาราง talents
    UPDATE public.talents
    SET stars = stars + v_reward_stars
    WHERE id = p_talent_id;

    RETURN QUERY SELECT true, 'ยินดีด้วย! ตรวจสอบผ่านและได้รับดาวแล้ว 🌟'::TEXT, v_current_calculated_value, true;
  ELSE
    -- ❌ ยังไม่ผ่านเกณฑ์: ส่งสถานะกลับไปบอกหน้าบ้านว่าขาดอีกเท่าไหร่
    RETURN QUERY SELECT false, ('ยังไม่ครบตามเป้า ขาดอีก ' || (v_target_value - v_current_calculated_value) || ' หน่วย')::TEXT, v_current_calculated_value, false;
  END IF;

END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 🔧 PATCH: submit_and_verify_quest — แก้ Time Window ตาม frequency
-- รันใน Supabase SQL Editor เพื่อแทนที่ version เดิม
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.submit_and_verify_quest(
  p_transaction_id INT,
  p_talent_id INT
)
RETURNS TABLE (
  is_success BOOLEAN,
  status_message TEXT,
  updated_value INT,
  final_status BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quest_id      INT;
  v_frequency     TEXT;   -- 'daily' | 'weekly' | 'monthly'
  v_target_type   TEXT;
  v_target_value  INT;
  v_reward_stars  INT;
  v_assigned_date DATE;
  v_start_date    DATE;
  v_end_date      DATE;
  v_current_calculated_value INT := 0;
  v_already_done  BOOLEAN;
BEGIN
  -- 1. ดึงข้อมูล transaction + quest template
  SELECT tq.quest_id, q.frequency, q.target_type, q.target_value,
         q.reward_stars, tq.is_done, tq.assigned_date
  INTO   v_quest_id, v_frequency, v_target_type, v_target_value,
         v_reward_stars, v_already_done, v_assigned_date
  FROM public.talent_quest_transactions tq
  JOIN public.quests q ON tq.quest_id = q.id
  WHERE tq.id = p_transaction_id AND tq.talent_id = p_talent_id;

  IF v_quest_id IS NULL THEN
    RETURN QUERY SELECT false, 'ไม่พบข้อมูลภารกิจนี้ในระบบของคุณ'::TEXT, 0, false;
    RETURN;
  END IF;

  IF v_already_done = true THEN
    RETURN QUERY SELECT false, 'ภารกิจนี้ทำสำเร็จและรับรางวัลไปเรียบร้อยแล้วจ้า 🌟'::TEXT, v_target_value, true;
    RETURN;
  END IF;

  -- ⏳ [TIME WINDOW] คำนวณช่วงเวลาตาม frequency
  v_start_date := v_assigned_date;

  CASE v_frequency
    WHEN 'daily'   THEN v_end_date := v_assigned_date;                          -- เฉพาะวันนั้น
    WHEN 'weekly'  THEN v_end_date := v_assigned_date + INTERVAL '6 days';      -- 7 วัน
    WHEN 'monthly' THEN v_end_date := (DATE_TRUNC('month', v_assigned_date)
                                       + INTERVAL '1 month - 1 day')::DATE;     -- สิ้นเดือน
    ELSE                v_end_date := v_assigned_date + INTERVAL '6 days';      -- fallback → weekly
  END CASE;

  -- 2. คำนวณ progress จริง
  IF v_target_type = 'short_video' THEN
    SELECT COUNT(c.id)::INT INTO v_current_calculated_value
    FROM public.clips c
    WHERE c.talent_id = p_talent_id
      AND c.status    = 'done'
      AND c.publish_date BETWEEN v_start_date AND v_end_date;

  ELSIF v_target_type = 'livestream' THEN
    SELECT COALESCE(
      SUM(
        CASE
          WHEN s.end_time >= s.start_time
            THEN EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600
          ELSE
            EXTRACT(EPOCH FROM ((s.end_time - s.start_time) + INTERVAL '24 hours')) / 3600
        END
      )::INT, 0
    ) INTO v_current_calculated_value
    FROM public.streams s
    WHERE s.talent_id  = p_talent_id
      AND s.status     = 'done'
      AND s.end_time   IS NOT NULL    -- ต้องสตรีมเสร็จจริง (มี end_time)
      AND s.stream_date BETWEEN v_start_date AND v_end_date;
  END IF;

  -- 3. อัปเดต current_value
  UPDATE public.talent_quest_transactions
  SET current_value = v_current_calculated_value
  WHERE id = p_transaction_id;

  -- 4. ตรวจสอบว่าครบเป้าหมาย
  IF v_current_calculated_value >= v_target_value THEN
    UPDATE public.talent_quest_transactions
    SET is_done      = true,
        completed_at = NOW()
    WHERE id = p_transaction_id;

    UPDATE public.talents
    SET stars = stars + v_reward_stars
    WHERE id = p_talent_id;

    RETURN QUERY SELECT true,
      ('ยินดีด้วย! ตรวจสอบผ่านและได้รับ ' || v_reward_stars || ' ดาวแล้ว 🌟')::TEXT,
      v_current_calculated_value, true;
  ELSE
    RETURN QUERY SELECT false,
      ('ยังไม่ครบตามเป้า (' || v_current_calculated_value || '/' || v_target_value || ' ' ||
       CASE v_target_type WHEN 'short_video' THEN 'คลิป' ELSE 'ชั่วโมง' END || ')')::TEXT,
      v_current_calculated_value, false;
  END IF;

END;
$$;