-- ==========================================
-- 0004_user_reflections_rls.sql
-- Strict data silo for AI flag tallies.
-- user_reflections is intentionally separate
-- from the public.reflections journal table —
-- it stores AI-computed emotional flags and
-- is never shared with the other parent.
-- ==========================================

create table if not exists public.user_reflections (
  id           uuid        primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  user_id      uuid        not null references auth.users(id) on delete cascade,

  -- Date the AI analysis covers
  analysis_date date       not null,

  -- Aggregate flag tallies (AI-computed, never surfaced to the other parent)
  flag_count       integer not null default 0,
  flag_breakdown   jsonb   not null default '{}',

  -- Overall emotional tone score (0–100)
  tone_score       numeric(5,2),

  -- Free-form summary from the AI
  ai_summary       text,

  unique (user_id, analysis_date)
);

drop trigger if exists trg_user_reflections_updated_at on public.user_reflections;
create trigger trg_user_reflections_updated_at
before update on public.user_reflections
for each row execute function public.set_updated_at();

create index if not exists idx_user_reflections_user_date
  on public.user_reflections(user_id, analysis_date desc);

-- ==========================================
-- STRICT RLS — individual user silo
-- No other user, admin role, or AI integration
-- may read another user's reflections.
-- ==========================================
alter table public.user_reflections enable row level security;

-- SELECT: own rows only
drop policy if exists "user_reflections_select_own" on public.user_reflections;
create policy "user_reflections_select_own"
on public.user_reflections for select
to authenticated
using (user_id = auth.uid());

-- INSERT: own rows only
drop policy if exists "user_reflections_insert_own" on public.user_reflections;
create policy "user_reflections_insert_own"
on public.user_reflections for insert
to authenticated
with check (user_id = auth.uid());

-- UPDATE: own rows only
drop policy if exists "user_reflections_update_own" on public.user_reflections;
create policy "user_reflections_update_own"
on public.user_reflections for update
to authenticated
using  (user_id = auth.uid())
with check (user_id = auth.uid());

-- DELETE: denied for all clients (service role may clean up on account deletion)
drop policy if exists "user_reflections_delete_none" on public.user_reflections;
create policy "user_reflections_delete_none"
on public.user_reflections for delete
to authenticated
using (false);
