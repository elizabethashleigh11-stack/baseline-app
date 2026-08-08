-- ==========================================
-- 0003_court_portal.sql
-- Accountability & Court Tracking — B2B Portal
-- ==========================================


-- ==========================================
-- 1) EXPENSES TABLE
-- ==========================================
create table if not exists public.expenses (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  connection_id uuid        not null references public.connections(id) on delete cascade,
  submitted_by  uuid        not null references public.users(id) on delete cascade,

  description   text        not null,
  amount_cents  integer     not null check (amount_cents > 0),
  currency      text        not null default 'USD',
  receipt_url   text,

  status        text        not null default 'pending',

  paid_at       timestamptz
);

alter table public.expenses
  drop constraint if exists expenses_status_valid;
alter table public.expenses
  add constraint expenses_status_valid
  check (status in ('pending', 'approved', 'disputed', 'paid'));

drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

create index if not exists idx_expenses_connection on public.expenses(connection_id);
create index if not exists idx_expenses_submitted_by on public.expenses(submitted_by);


-- ==========================================
-- 2) PROFESSIONAL ACCESS TABLE
-- ==========================================
create table if not exists public.professional_access (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  user_id       uuid        not null references public.users(id) on delete cascade,
  connection_id uuid        not null references public.connections(id) on delete cascade,

  role          text        not null,

  granted_by    uuid        not null references public.users(id) on delete cascade,
  granted_at    timestamptz not null default now(),
  expires_at    timestamptz
);

alter table public.professional_access
  drop constraint if exists professional_access_role_valid;
alter table public.professional_access
  add constraint professional_access_role_valid
  check (role in ('attorney_a', 'attorney_b', 'gal', 'judge'));

create unique index if not exists uidx_professional_access_user_connection
  on public.professional_access(user_id, connection_id);

create index if not exists idx_professional_access_user on public.professional_access(user_id);
create index if not exists idx_professional_access_connection on public.professional_access(connection_id);


-- ==========================================
-- 3) SLA EVENTS TABLE
-- ==========================================
create table if not exists public.sla_events (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  connection_id uuid        not null references public.connections(id) on delete cascade,
  event_type    text        not null,
  reference_id  uuid        not null,

  occurred_at   timestamptz not null default now(),
  deadline_at   timestamptz not null,

  met           boolean     not null default false,
  resolved_at   timestamptz
);

alter table public.sla_events
  drop constraint if exists sla_events_event_type_valid;
alter table public.sla_events
  add constraint sla_events_event_type_valid
  check (event_type in (
    'message_sent',
    'message_acknowledged',
    'expense_submitted',
    'expense_paid'
  ));

create index if not exists idx_sla_events_connection on public.sla_events(connection_id);
create index if not exists idx_sla_events_reference on public.sla_events(reference_id);
create index if not exists idx_sla_events_deadline on public.sla_events(deadline_at) where not met;


-- ==========================================
-- 4) BEHAVIORAL FLAGS TABLE
-- ==========================================
create table if not exists public.behavioral_flags (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  connection_id uuid        not null references public.connections(id) on delete cascade,
  user_id       uuid        not null references public.users(id) on delete cascade,

  flag_type     text        not null,
  detail        text        not null default '',
  flagged_at    timestamptz not null default now()
);

create index if not exists idx_behavioral_flags_connection on public.behavioral_flags(connection_id);
create index if not exists idx_behavioral_flags_user on public.behavioral_flags(user_id);
create index if not exists idx_behavioral_flags_flagged_at on public.behavioral_flags(flagged_at);


-- ==========================================
-- 5) DOCKET REPORTS TABLE
-- ==========================================
create table if not exists public.docket_reports (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  connection_id uuid        not null references public.connections(id) on delete cascade,
  generated_by  uuid        not null references public.users(id) on delete cascade,
  generated_at  timestamptz not null default now(),

  sha256_hash   text        not null,
  storage_path  text        not null
);

create index if not exists idx_docket_reports_connection on public.docket_reports(connection_id);


-- ==========================================
-- 6) MANDATE ENROLLMENT TABLE
-- ==========================================
create table if not exists public.mandate_enrollment (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  connection_id uuid        not null references public.connections(id) on delete cascade,
  start_date    date        not null,
  -- 18 months ≈ 540 days
  end_date      date        not null generated always as (start_date + interval '540 days') stored
);

create unique index if not exists uidx_mandate_enrollment_connection
  on public.mandate_enrollment(connection_id);


-- ==========================================
-- 7) DB TRIGGERS
-- ==========================================

-- 7a) After a message is inserted, create a message_sent SLA event (72h deadline)
create or replace function public.trg_fn_sla_message_sent()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.sla_events (
    connection_id,
    event_type,
    reference_id,
    occurred_at,
    deadline_at,
    met
  ) values (
    new.connection_id,
    'message_sent',
    new.id,
    new.created_at,
    new.created_at + interval '72 hours',
    false
  );
  return new;
end;
$$;

drop trigger if exists trg_sla_message_sent on public.messages;
create trigger trg_sla_message_sent
after insert on public.messages
for each row execute function public.trg_fn_sla_message_sent();


-- 7b) When a message's read_at is set, mark the SLA event as met if within deadline
create or replace function public.trg_fn_sla_message_acknowledged()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only act when read_at transitions from null to a value
  if old.read_at is null and new.read_at is not null then
    update public.sla_events
    set
      met         = (new.read_at <= deadline_at),
      resolved_at = new.read_at
    where reference_id = new.id
      and event_type   = 'message_sent'
      and resolved_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sla_message_acknowledged on public.messages;
create trigger trg_sla_message_acknowledged
after update on public.messages
for each row execute function public.trg_fn_sla_message_acknowledged();


-- 7c) After an expense is inserted, create an expense_submitted SLA event (30-day deadline)
create or replace function public.trg_fn_sla_expense_submitted()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.sla_events (
    connection_id,
    event_type,
    reference_id,
    occurred_at,
    deadline_at,
    met
  ) values (
    new.connection_id,
    'expense_submitted',
    new.id,
    new.created_at,
    new.created_at + interval '30 days',
    false
  );
  return new;
end;
$$;

drop trigger if exists trg_sla_expense_submitted on public.expenses;
create trigger trg_sla_expense_submitted
after insert on public.expenses
for each row execute function public.trg_fn_sla_expense_submitted();


-- 7d) When an expense is paid, mark its SLA event as met if within deadline
create or replace function public.trg_fn_sla_expense_paid()
returns trigger
language plpgsql
security definer
as $$
begin
  if old.status <> 'paid' and new.status = 'paid' and new.paid_at is not null then
    update public.sla_events
    set
      met         = (new.paid_at <= deadline_at),
      resolved_at = new.paid_at
    where reference_id = new.id
      and event_type   = 'expense_submitted'
      and resolved_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sla_expense_paid on public.expenses;
create trigger trg_sla_expense_paid
after update on public.expenses
for each row execute function public.trg_fn_sla_expense_paid();


-- ==========================================
-- 8) GRADUATION METRICS VIEW
-- ==========================================
-- Groups behavioral flags by calendar month within the 18-month mandate window.
-- Month 1 = first calendar month of mandate start_date.
create or replace view public.graduation_metrics as
select
  me.connection_id,
  me.start_date,
  me.end_date,
  date_trunc('month', bf.flagged_at)::date             as month_start,
  -- Month number relative to mandate start (1-based)
  (
    extract(year  from age(date_trunc('month', bf.flagged_at), date_trunc('month', me.start_date::timestamptz))) * 12
    + extract(month from age(date_trunc('month', bf.flagged_at), date_trunc('month', me.start_date::timestamptz)))
    + 1
  )::integer                                           as mandate_month,
  count(bf.id)::integer                                as intervention_count
from public.mandate_enrollment me
join public.behavioral_flags bf
  on bf.connection_id = me.connection_id
 and bf.flagged_at >= me.start_date::timestamptz
 and bf.flagged_at <  me.end_date::timestamptz
group by
  me.connection_id,
  me.start_date,
  me.end_date,
  date_trunc('month', bf.flagged_at);


-- ==========================================
-- 9) RLS HELPER FUNCTION
-- ==========================================
create or replace function public.is_professional_for_connection(p_connection_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.professional_access pa
    where pa.user_id      = auth.uid()
      and pa.connection_id = p_connection_id
      and (pa.expires_at is null or pa.expires_at > now())
  );
$$;


-- ==========================================
-- 10) ENABLE RLS
-- ==========================================
alter table public.expenses            enable row level security;
alter table public.professional_access enable row level security;
alter table public.sla_events          enable row level security;
alter table public.behavioral_flags    enable row level security;
alter table public.docket_reports      enable row level security;
alter table public.mandate_enrollment  enable row level security;


-- ==========================================
-- 11) RLS POLICIES
-- ==========================================

-- ---------- EXPENSES ----------

drop policy if exists "expenses_select_member" on public.expenses;
create policy "expenses_select_member"
on public.expenses for select
to authenticated
using (public.is_active_connection_member(connection_id));

drop policy if exists "expenses_insert_member" on public.expenses;
create policy "expenses_insert_member"
on public.expenses for insert
to authenticated
with check (
  public.is_active_connection_member(connection_id)
  and submitted_by = auth.uid()
);

drop policy if exists "expenses_update_member" on public.expenses;
create policy "expenses_update_member"
on public.expenses for update
to authenticated
using (public.is_active_connection_member(connection_id))
with check (public.is_active_connection_member(connection_id));

drop policy if exists "expenses_delete_none" on public.expenses;
create policy "expenses_delete_none"
on public.expenses for delete
to authenticated
using (false);


-- ---------- PROFESSIONAL ACCESS ----------
-- Professionals can see their own access grants; connection members can see who has access.
drop policy if exists "professional_access_select" on public.professional_access;
create policy "professional_access_select"
on public.professional_access for select
to authenticated
using (
  user_id = auth.uid()
  or auth.uid() in (
    select parent_a from public.connections where id = connection_id
    union
    select parent_b from public.connections where id = connection_id
  )
);

drop policy if exists "professional_access_insert_member" on public.professional_access;
create policy "professional_access_insert_member"
on public.professional_access for insert
to authenticated
with check (
  auth.uid() in (
    select parent_a from public.connections where id = connection_id
    union
    select parent_b from public.connections where id = connection_id
  )
);

drop policy if exists "professional_access_update_member" on public.professional_access;
create policy "professional_access_update_member"
on public.professional_access for update
to authenticated
using (
  auth.uid() in (
    select parent_a from public.connections where id = connection_id
    union
    select parent_b from public.connections where id = connection_id
  )
);

drop policy if exists "professional_access_delete_member" on public.professional_access;
create policy "professional_access_delete_member"
on public.professional_access for delete
to authenticated
using (
  auth.uid() in (
    select parent_a from public.connections where id = connection_id
    union
    select parent_b from public.connections where id = connection_id
  )
);


-- ---------- SLA EVENTS (professionals + parents in active connection) ----------

drop policy if exists "sla_events_select_professional" on public.sla_events;
create policy "sla_events_select_professional"
on public.sla_events for select
to authenticated
using (
  public.is_professional_for_connection(connection_id)
  or public.is_active_connection_member(connection_id)
);

-- Only service role (API) may insert/update SLA events.
-- No client-facing insert/update policies.


-- ---------- BEHAVIORAL FLAGS ----------

drop policy if exists "behavioral_flags_select_professional" on public.behavioral_flags;
create policy "behavioral_flags_select_professional"
on public.behavioral_flags for select
to authenticated
using (
  public.is_professional_for_connection(connection_id)
  or public.is_active_connection_member(connection_id)
);


-- ---------- DOCKET REPORTS ----------

drop policy if exists "docket_reports_select_professional" on public.docket_reports;
create policy "docket_reports_select_professional"
on public.docket_reports for select
to authenticated
using (public.is_professional_for_connection(connection_id));


-- ---------- MANDATE ENROLLMENT ----------

drop policy if exists "mandate_enrollment_select" on public.mandate_enrollment;
create policy "mandate_enrollment_select"
on public.mandate_enrollment for select
to authenticated
using (
  public.is_professional_for_connection(connection_id)
  or public.is_active_connection_member(connection_id)
);
