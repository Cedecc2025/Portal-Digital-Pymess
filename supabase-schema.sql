-- supabase-schema.sql
-- Tablas recomendadas para soportar el asistente de estrategias de marketing.

create table if not exists public.marketing_strategies (
  id bigint generated always as identity primary key,
  user_id bigint not null,
  strategy_name text not null,
  status text not null default 'En progreso',
  updated_at timestamptz not null default timezone('utc', now()),
  constraint marketing_strategies_user_fk foreign key (user_id) references public.usuarios (id) on delete cascade
);

create table if not exists public.marketing_company_profiles (
  strategy_id bigint primary key references public.marketing_strategies (id) on delete cascade,
  name text,
  industry text,
  size text,
  current_situation text
);

create table if not exists public.marketing_audiences (
  strategy_id bigint primary key references public.marketing_strategies (id) on delete cascade,
  demographics text,
  interests text,
  pain_points text,
  motivations text,
  objections text,
  preferred_channels text[],
  contact_email text
);

create table if not exists public.marketing_buyer_personas (
  id bigint generated always as identity primary key,
  strategy_id bigint not null references public.marketing_strategies (id) on delete cascade,
  persona_name text not null,
  motivations text,
  objections text,
  preferred_channels text[]
);

create table if not exists public.marketing_objectives (
  id bigint generated always as identity primary key,
  strategy_id bigint not null references public.marketing_strategies (id) on delete cascade,
  objective_text text not null,
  priority_order integer not null default 1
);

create table if not exists public.marketing_channels (
  id bigint generated always as identity primary key,
  strategy_id bigint not null references public.marketing_strategies (id) on delete cascade,
  channel_id text not null,
  allocation numeric default 0
);

create table if not exists public.marketing_budgets (
  strategy_id bigint primary key references public.marketing_strategies (id) on delete cascade,
  total_amount numeric,
  distribution_json jsonb
);

create table if not exists public.marketing_timeline_activities (
  id bigint generated always as identity primary key,
  strategy_id bigint not null references public.marketing_strategies (id) on delete cascade,
  month_index integer,
  description text,
  responsible text,
  dependencies text,
  cost_estimate numeric
);

create table if not exists public.marketing_calendar_entries (
  id bigint generated always as identity primary key,
  strategy_id bigint not null references public.marketing_strategies (id) on delete cascade,
  day_of_week text,
  channel_id text,
  content_type text,
  publish_time text
);

create table if not exists public.marketing_kpis (
  id bigint generated always as identity primary key,
  strategy_id bigint not null references public.marketing_strategies (id) on delete cascade,
  kpi_name text not null,
  measurement_type text,
  monthly_target numeric
);

create table if not exists public.marketing_kpi_results (
  id bigint generated always as identity primary key,
  strategy_id bigint not null references public.marketing_strategies (id) on delete cascade,
  month_label text not null,
  kpi_name text not null,
  target_value numeric,
  actual_value numeric,
  variation numeric
);

create table if not exists public.marketing_competitors (
  id bigint generated always as identity primary key,
  strategy_id bigint not null references public.marketing_strategies (id) on delete cascade,
  competitor_name text,
  value_proposition text,
  notes text
);

create table if not exists public.marketing_swot_entries (
  id bigint generated always as identity primary key,
  strategy_id bigint not null references public.marketing_strategies (id) on delete cascade,
  category text not null,
  description text not null
);

create table if not exists public.marketing_campaigns (
  id bigint generated always as identity primary key,
  strategy_id bigint not null references public.marketing_strategies (id) on delete cascade,
  campaign_name text,
  channel text,
  budget numeric,
  start_date date,
  end_date date,
  goal text,
  status text
);

create table if not exists public.marketing_automations (
  id bigint generated always as identity primary key,
  strategy_id bigint not null references public.marketing_strategies (id) on delete cascade,
  automation_name text,
  trigger_event text,
  cadence text,
  tool text
);

create table if not exists public.marketing_version_logs (
  strategy_id bigint primary key references public.marketing_strategies (id) on delete cascade,
  status text,
  updated_at timestamptz default timezone('utc', now()),
  author text
);
