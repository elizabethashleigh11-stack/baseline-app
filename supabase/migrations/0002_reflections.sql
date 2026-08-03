-- ==========================================
-- 0002_reflections.sql
-- Daily reflection autosave table + RLS
-- ==========================================

create table if not exists public.reflections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  entry_date  date not null,
  text        text not null default '',
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, entry_date)
);

drop trigger if exists trg_reflections_updated_at on public.reflections;
create trigger trg_reflections_updated_at
before update on public.reflections
for each row execute function public.set_updated_at();

create index if not exists idx_reflections_user_date
  on public.reflections(user_id, entry_date desc);

alter table public.reflections enable row level security;

drop policy if exists "reflections_select_own" on public.reflections;
create policy "reflections_select_own"
on public.reflections for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "reflections_insert_own" on public.reflections;
create policy "reflections_insert_own"
on public.reflections for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "reflections_update_own" on public.reflections;
create policy "reflections_update_own"
on public.reflections for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "reflections_delete_none" on public.reflections;
create policy "reflections_delete_none"
on public.reflections for delete
to authenticated
using (false);
