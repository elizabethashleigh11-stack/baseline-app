-- ==========================================
-- 0003_logistics.sql
-- Baseline App — Logistics & Connectors (Frictionless Hub)
-- Run this in the Supabase SQL Editor after 0001 and 0002.
-- ==========================================


-- ==========================================
-- 1) LOGISTICS EVENTS
-- Unified schedule for custody, sports/extracurriculars, and appointments.
-- ==========================================
create table if not exists public.logistics_events (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  connection_id   uuid        not null references public.connections(id) on delete cascade,
  created_by      uuid        not null references public.users(id) on delete cascade,

  title           text        not null,
  event_type      text        not null default 'general',
  -- e.g. 'custody', 'sports', 'medical', 'school', 'general'

  starts_at       timestamptz not null,
  ends_at         timestamptz,
  location        text,
  notes           text,

  -- External source metadata (EdTech / MedTech sync)
  external_source text,   -- e.g. 'canvas', 'infinite_campus', 'mychart'
  external_id     text    -- original ID from the external system
);

create index if not exists idx_logistics_events_connection
  on public.logistics_events(connection_id, starts_at);
create index if not exists idx_logistics_events_created_by
  on public.logistics_events(created_by);

drop trigger if exists trg_logistics_events_updated_at on public.logistics_events;
create trigger trg_logistics_events_updated_at
before update on public.logistics_events
for each row execute function public.set_updated_at();

-- Valid event types
alter table public.logistics_events
  drop constraint if exists logistics_events_type_valid;
alter table public.logistics_events
  add constraint logistics_events_type_valid
  check (event_type in ('custody', 'sports', 'medical', 'school', 'general'));


-- ==========================================
-- 2) APPROVALS
-- Frictionless thumbs-up acknowledgements tied to a logistics event.
-- ==========================================
create table if not exists public.approvals (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  event_id        uuid        not null references public.logistics_events(id) on delete cascade,
  user_id         uuid        not null references public.users(id) on delete cascade,

  -- 'approved' (👍), 'declined' (👎), or 'noted' (📌)
  reaction        text        not null default 'approved',

  unique (event_id, user_id)
);

alter table public.approvals
  drop constraint if exists approvals_reaction_valid;
alter table public.approvals
  add constraint approvals_reaction_valid
  check (reaction in ('approved', 'declined', 'noted'));


-- ==========================================
-- 3) GPS CHECK-INS
-- Opt-in geofence verifications for drop-off / pick-up arrivals.
-- ==========================================
create table if not exists public.gps_checkins (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  event_id        uuid        not null references public.logistics_events(id) on delete cascade,
  user_id         uuid        not null references public.users(id) on delete cascade,

  -- Stored as plain numerics; never exposed beyond the connection pair.
  latitude        double precision not null,
  longitude       double precision not null,

  -- Geofence result: within 500 ft of the event location?
  within_geofence boolean     not null default false,

  verified_at     timestamptz not null default now()
);

create index if not exists idx_gps_checkins_event
  on public.gps_checkins(event_id, created_at desc);


-- ==========================================
-- 4) ENABLE RLS
-- ==========================================
alter table public.logistics_events enable row level security;
alter table public.approvals         enable row level security;
alter table public.gps_checkins      enable row level security;


-- ==========================================
-- 5) RLS POLICIES — LOGISTICS EVENTS
-- ==========================================

drop policy if exists "logistics_events_select_member" on public.logistics_events;
create policy "logistics_events_select_member"
on public.logistics_events for select
to authenticated
using (public.is_active_connection_member(connection_id));

drop policy if exists "logistics_events_insert_member" on public.logistics_events;
create policy "logistics_events_insert_member"
on public.logistics_events for insert
to authenticated
with check (
  public.is_active_connection_member(connection_id)
  and created_by = auth.uid()
);

drop policy if exists "logistics_events_update_creator" on public.logistics_events;
create policy "logistics_events_update_creator"
on public.logistics_events for update
to authenticated
using  (created_by = auth.uid() and public.is_active_connection_member(connection_id))
with check (created_by = auth.uid() and public.is_active_connection_member(connection_id));

drop policy if exists "logistics_events_delete_creator" on public.logistics_events;
create policy "logistics_events_delete_creator"
on public.logistics_events for delete
to authenticated
using (created_by = auth.uid() and public.is_active_connection_member(connection_id));


-- ==========================================
-- 6) RLS POLICIES — APPROVALS
-- ==========================================

drop policy if exists "approvals_select_connection_member" on public.approvals;
create policy "approvals_select_connection_member"
on public.approvals for select
to authenticated
using (
  exists (
    select 1 from public.logistics_events e
    where e.id = event_id
      and public.is_active_connection_member(e.connection_id)
  )
);

drop policy if exists "approvals_insert_own" on public.approvals;
create policy "approvals_insert_own"
on public.approvals for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.logistics_events e
    where e.id = event_id
      and public.is_active_connection_member(e.connection_id)
  )
);

drop policy if exists "approvals_update_own" on public.approvals;
create policy "approvals_update_own"
on public.approvals for update
to authenticated
using  (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "approvals_delete_own" on public.approvals;
create policy "approvals_delete_own"
on public.approvals for delete
to authenticated
using (user_id = auth.uid());


-- ==========================================
-- 7) RLS POLICIES — GPS CHECK-INS
-- ==========================================

drop policy if exists "gps_checkins_select_connection_member" on public.gps_checkins;
create policy "gps_checkins_select_connection_member"
on public.gps_checkins for select
to authenticated
using (
  exists (
    select 1 from public.logistics_events e
    where e.id = event_id
      and public.is_active_connection_member(e.connection_id)
  )
);

drop policy if exists "gps_checkins_insert_own" on public.gps_checkins;
create policy "gps_checkins_insert_own"
on public.gps_checkins for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.logistics_events e
    where e.id = event_id
      and public.is_active_connection_member(e.connection_id)
  )
);

-- GPS data is never updated or deleted by clients; use insert-only policy above.
drop policy if exists "gps_checkins_no_update" on public.gps_checkins;
create policy "gps_checkins_no_update"
on public.gps_checkins for update
to authenticated
using (false);

drop policy if exists "gps_checkins_no_delete" on public.gps_checkins;
create policy "gps_checkins_no_delete"
on public.gps_checkins for delete
to authenticated
using (false);
