-- ==========================================
-- 0003_privacy_security_monetization.sql
-- Privacy, Security & Monetization features:
--   1. subscriptions        (One-Pays Model)
--   2. opt_out_requests     (Mutual Opt-Out Clause)
--   3. audit_log            (Immutable Audit Trail)
-- ==========================================


-- ==========================================
-- 1) SUBSCRIPTIONS — One-Pays Model
-- ==========================================
create table if not exists public.subscriptions (
  id                     uuid        primary key default gen_random_uuid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- The co-parenting connection this subscription covers
  connection_id          uuid        not null references public.connections(id) on delete cascade,

  -- The parent who is actually paying (the "one payer")
  paying_user_id         uuid        not null references public.users(id) on delete cascade,

  -- 'premium' = guardrails active for both parents; 'free' = mandated free tier
  plan                   text        not null default 'free',

  -- Stripe integration
  stripe_customer_id     text,
  stripe_subscription_id text,

  -- 'active' | 'canceled' | 'past_due' | 'trialing'
  status                 text        not null default 'active',

  unique (connection_id)
);

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create index if not exists idx_subscriptions_connection
  on public.subscriptions(connection_id);
create index if not exists idx_subscriptions_paying_user
  on public.subscriptions(paying_user_id);

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_valid;
alter table public.subscriptions
  add constraint subscriptions_plan_valid
  check (plan in ('free', 'premium'));

alter table public.subscriptions
  drop constraint if exists subscriptions_status_valid;
alter table public.subscriptions
  add constraint subscriptions_status_valid
  check (status in ('active', 'canceled', 'past_due', 'trialing'));

alter table public.subscriptions enable row level security;

-- Members of the connection can read their subscription details
drop policy if exists "subscriptions_select_member" on public.subscriptions;
create policy "subscriptions_select_member"
on public.subscriptions for select
to authenticated
using (public.is_connection_member(connection_id));

-- Only the paying user (or server-side Stripe webhook via service role) can insert
drop policy if exists "subscriptions_insert_paying_user" on public.subscriptions;
create policy "subscriptions_insert_paying_user"
on public.subscriptions for insert
to authenticated
with check (
  paying_user_id = auth.uid()
  and public.is_connection_member(connection_id)
);

-- Only the paying user can update their own subscription record
drop policy if exists "subscriptions_update_paying_user" on public.subscriptions;
create policy "subscriptions_update_paying_user"
on public.subscriptions for update
to authenticated
using  (paying_user_id = auth.uid())
with check (paying_user_id = auth.uid());

-- No client-side deletes
drop policy if exists "subscriptions_delete_none" on public.subscriptions;
create policy "subscriptions_delete_none"
on public.subscriptions for delete
to authenticated
using (false);


-- ==========================================
-- 2) OPT-OUT REQUESTS — Mutual Opt-Out Clause
-- ==========================================
create table if not exists public.opt_out_requests (
  id                uuid        primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  connection_id     uuid        not null references public.connections(id) on delete cascade,

  -- The parent who initiated the opt-out request
  requested_by      uuid        not null references public.users(id) on delete cascade,
  requested_at      timestamptz not null default now(),

  -- Filled in when the other party countersigns
  countersigned_by  uuid        references public.users(id) on delete set null,
  countersigned_at  timestamptz,

  -- 'pending' | 'completed' | 'withdrawn'
  status            text        not null default 'pending',

  unique (connection_id, status)  -- only one active opt-out per connection
);

drop trigger if exists trg_opt_out_requests_updated_at on public.opt_out_requests;
create trigger trg_opt_out_requests_updated_at
before update on public.opt_out_requests
for each row execute function public.set_updated_at();

create index if not exists idx_opt_out_requests_connection
  on public.opt_out_requests(connection_id);

alter table public.opt_out_requests
  drop constraint if exists opt_out_requests_status_valid;
alter table public.opt_out_requests
  add constraint opt_out_requests_status_valid
  check (status in ('pending', 'completed', 'withdrawn'));

-- countersigned_by must be the other parent, enforced at application level
alter table public.opt_out_requests
  drop constraint if exists opt_out_requests_countersigner_not_requester;
alter table public.opt_out_requests
  add constraint opt_out_requests_countersigner_not_requester
  check (countersigned_by is null or countersigned_by <> requested_by);

-- countersigned_at requires countersigned_by and vice-versa
alter table public.opt_out_requests
  drop constraint if exists opt_out_requests_countersign_consistency;
alter table public.opt_out_requests
  add constraint opt_out_requests_countersign_consistency
  check (
    (countersigned_by is null and countersigned_at is null)
    or (countersigned_by is not null and countersigned_at is not null)
  );

alter table public.opt_out_requests enable row level security;

drop policy if exists "opt_out_select_member" on public.opt_out_requests;
create policy "opt_out_select_member"
on public.opt_out_requests for select
to authenticated
using (public.is_connection_member(connection_id));

drop policy if exists "opt_out_insert_member" on public.opt_out_requests;
create policy "opt_out_insert_member"
on public.opt_out_requests for insert
to authenticated
with check (
  requested_by = auth.uid()
  and public.is_active_connection_member(connection_id)
);

-- Members can update (to countersign or withdraw)
drop policy if exists "opt_out_update_member" on public.opt_out_requests;
create policy "opt_out_update_member"
on public.opt_out_requests for update
to authenticated
using  (public.is_connection_member(connection_id))
with check (public.is_connection_member(connection_id));

drop policy if exists "opt_out_delete_none" on public.opt_out_requests;
create policy "opt_out_delete_none"
on public.opt_out_requests for delete
to authenticated
using (false);


-- ==========================================
-- 3) AUDIT LOG — Immutable Audit Trail
-- ==========================================
create table if not exists public.audit_log (
  id           uuid        primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  -- Nullable: some events (e.g. anonymous login attempts) may not have a case
  connection_id uuid       references public.connections(id) on delete set null,

  -- The authenticated user who performed the action
  actor_id     uuid        not null references public.users(id) on delete cascade,

  -- Enumerated action type
  action       text        not null,

  -- Polymorphic reference to the affected object
  target_type  text,
  target_id    uuid,

  -- Network context
  ip_address   inet,
  user_agent   text,

  -- Arbitrary extra data (structured)
  metadata     jsonb       not null default '{}'
);

create index if not exists idx_audit_log_actor
  on public.audit_log(actor_id, created_at desc);
create index if not exists idx_audit_log_connection
  on public.audit_log(connection_id, created_at desc);
create index if not exists idx_audit_log_action
  on public.audit_log(action);

alter table public.audit_log
  drop constraint if exists audit_log_action_valid;
alter table public.audit_log
  add constraint audit_log_action_valid
  check (action in (
    'login',
    'logout',
    'message_sent',
    'schedule_updated',
    'document_uploaded',
    'child_record_updated',
    'subscription_created',
    'subscription_updated',
    'opt_out_requested',
    'opt_out_countersigned',
    'opt_out_withdrawn',
    'report_exported'
  ));

alter table public.audit_log enable row level security;

-- Users can only read their own audit entries
drop policy if exists "audit_log_select_own" on public.audit_log;
create policy "audit_log_select_own"
on public.audit_log for select
to authenticated
using (actor_id = auth.uid());

-- Application code inserts audit rows on behalf of the current user
drop policy if exists "audit_log_insert_own" on public.audit_log;
create policy "audit_log_insert_own"
on public.audit_log for insert
to authenticated
with check (actor_id = auth.uid());

-- IMMUTABILITY: no UPDATE or DELETE allowed from any client (service role bypasses RLS)
-- We intentionally omit update/delete policies so they are denied by default.
-- The trigger below adds an extra database-level guard.

-- Trigger function: prevent any UPDATE on audit_log rows
create or replace function public.audit_log_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log rows are immutable and cannot be modified.';
end;
$$;

drop trigger if exists trg_audit_log_immutable on public.audit_log;
create trigger trg_audit_log_immutable
before update or delete on public.audit_log
for each row execute function public.audit_log_immutable();
