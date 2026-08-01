-- ==========================================
-- 0003_reflection_export_and_access.sql
-- Reflection export surface + portal-based access hardening
-- ==========================================

-- ==========================================
-- 1) USERS: portal type for access gating
-- ==========================================
alter table public.users
  add column if not exists portal_type text not null default 'parent';

alter table public.users
  drop constraint if exists users_portal_type_valid;
alter table public.users
  add constraint users_portal_type_valid
  check (portal_type in ('parent', 'professional'));

create index if not exists idx_users_portal_type
  on public.users(portal_type);

-- ==========================================
-- 2) HELPER: current user's portal type
-- ==========================================
create or replace function public.current_user_portal_type()
returns text
language sql
stable
as $$
  select u.portal_type
  from public.users u
  where u.id = auth.uid()
$$;

-- ==========================================
-- 3) HARDEN PRIVATE TABLES
-- ==========================================
alter table public.message_drafts_private force row level security;
alter table public.user_reflections      force row level security;

-- ==========================================
-- 4) USER-OWNED EXPORT SURFACE
-- ==========================================
create or replace function public.export_my_reflection_trends()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  export_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if public.current_user_portal_type() <> 'parent' then
    raise exception 'Reflection exports are only available in the parent portal.';
  end if;

  with reflection_rows as (
    select category, created_at
    from public.user_reflections
    where user_id = auth.uid()
  ),
  totals as (
    select coalesce(
      jsonb_object_agg(category, count_per_category),
      '{}'::jsonb
    ) as value
    from (
      select category, count(*)::int as count_per_category
      from reflection_rows
      group by category
    ) grouped
  ),
  last_30_days as (
    select coalesce(
      jsonb_object_agg(category, count_per_category),
      '{}'::jsonb
    ) as value
    from (
      select category, count(*)::int as count_per_category
      from reflection_rows
      where created_at >= now() - interval '30 days'
      group by category
    ) grouped
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'userId', auth.uid(),
    'totalEvents', (select count(*)::int from reflection_rows),
    'totals', (select value from totals),
    'last30Days', (select value from last_30_days)
  )
  into export_payload;

  return export_payload;
end;
$$;

revoke all on function public.export_my_reflection_trends() from public;
grant execute on function public.export_my_reflection_trends() to authenticated;
