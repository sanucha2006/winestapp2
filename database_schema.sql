-- ══════════════════════════════════════════════════════════════
-- 🛠️ DATABASE SCHEMA (FROM USER EXACT DATA)
-- ══════════════════════════════════════════════════════════════

-- 1. PROFILES (ตารางหลักที่ถูกอ้างอิงโดยตารางอื่นๆ)
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

-- 2. TALENTS (ตารางที่อ้างอิง profiles และถูกอ้างอิงโดยตารางงานอื่นๆ)
create table public.talents (
  id serial not null,
  user_id uuid null,
  talent_name text not null,
  is_active boolean null default true,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint talents_pkey primary key (id),
  constraint talents_user_id_fkey foreign KEY (user_id) references profiles (id)
) TABLESPACE pg_default;

-- 3. COMMISSIONS (ตารางงานหลักของคอมมิชชัน)
create table public.commissions (
  id serial not null,
  title text not null,
  owner_id uuid not null,
  talent_id integer null,
  status character varying(20) null default 'todo'::character varying,
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

-- 4. COMMISSION_PARTNERS (ตารางลูกของ commissions)
create table public.commission_partners (
  id serial not null,
  commission_id integer not null,
  team_member_id uuid not null,
  share_amount numeric null default 0,
  constraint commission_partners_pkey primary key (id),
  constraint commission_partners_commission_id_fkey foreign KEY (commission_id) references commissions (id) on delete CASCADE,
  constraint commission_partners_team_member_id_fkey foreign KEY (team_member_id) references profiles (id)
) TABLESPACE pg_default;

-- 5. CLIPS (ตารางคิวคลิป พร้อมคอลัมน์ created_by ตัวใหม่)
create table public.clips (
  id serial not null,
  talent_id integer not null,
  idea_title text not null,
  publish_date date null,
  format text null default 'Short'::text,
  status character varying(20) null default 'todo'::character varying,
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

-- 6. STREAMS (ตารางคิวไลฟ์สตรีม พร้อมคอลัมน์ created_by ตัวใหม่)
create table public.streams (
  id serial not null,
  talent_id integer not null,
  title text not null,
  stream_date date not null,
  start_time time without time zone null,
  end_time time without time zone null,
  platform text null default 'YouTube'::text,
  status character varying(20) null default 'upcoming'::character varying,
  needs_thumbnail boolean null default true,
  thumbnail_done boolean null default false,
  revenue numeric null default 0,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  created_by uuid null,
  constraint streams_pkey primary key (id),
  constraint streams_created_by_fkey foreign KEY (created_by) references profiles (id) on delete RESTRICT,
  constraint streams_talent_id_fkey foreign KEY (talent_id) references talents (id)
) TABLESPACE pg_default;

-- 7. QUESTS (ตารางเควสรายวันของ Vtuber)
create table public.quests (
  id serial not null,
  talent_id integer not null,
  title text not null,
  quest_type text null default 'daily'::text,
  is_done boolean null default false,
  resets_daily boolean null default true,
  assigned_date date not null,
  constraint quests_pkey primary key (id),
  constraint quests_talent_id_fkey foreign KEY (talent_id) references talents (id)
) TABLESPACE pg_default;

-- 8. BILLING_RECORDS (ตารางบันทึกบัญชีและการจ่ายเงิน)
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