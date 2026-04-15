-- ==========================================
-- 0001_init.sql
-- Baseline App — initial schema
-- Run this in the Supabase SQL Editor.
-- ==========================================


-- ==========================================
-- 0) EXTENSIONS
-- ==========================================
create extension if not exists "pgcrypto";


-- ==========================================
-- 1) GENERIC HELPERS
-- (defined before tables so triggers can reference them)
-- ==========================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ==========================================
-- 2) TABLES
-- (columns + FK references only; check constraints added in step 3)
-- ==========================================

-- 2.1) USERS
-- Profile table; the auth identity lives in auth.users (managed by Supabase Auth).
create table if not exists public.users (
  id          uuid        primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  display_name text,
  email       text
);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();


-- 2.2) CONNECTIONS
-- Links Parent A to Parent B.  Supports a Pending Invite lifecycle:
--   pending  → Parent A sends an invite code to Parent B
--   active   → Parent B accepted the invite
--   rejected → Parent B declined
--   blocked  → either parent blocked the connection
create table if not exists public.connections (
  id               uuid        primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),

  parent_a         uuid        not null references public.users(id) on delete cascade,
  parent_b         uuid        not null references public.users(id) on delete cascade,

  status           text        not null default 'pending',

  invited_by       uuid        not null references public.users(id) on delete cascade,

  invite_code      text        not null,
  invite_expires_at timestamptz,
  accepted_at      timestamptz
);

create index if not exists idx_connections_parent_a    on public.connections(parent_a);
create index if not exists idx_connections_parent_b    on public.connections(parent_b);
create index if not exists idx_connections_status      on public.connections(status);
create unique index if not exists uidx_connections_invite_code on public.connections(invite_code);


-- 2.3) MESSAGES
create table if not exists public.messages (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  connection_id uuid        not null references public.connections(id) on delete cascade,
  sender_id     uuid        not null references public.users(id) on delete cascade,

  body          text        not null,

  delivered_at  timestamptz,
  read_at       timestamptz
);

create index if not exists idx_messages_connection_created_at
  on public.messages(connection_id, created_at desc);
create index if not exists idx_messages_sender
  on public.messages(sender_id);


-- 2.4) EXPENSES
create table if not exists public.expenses (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  connection_id uuid        not null references public.connections(id) on delete cascade,
  created_by    uuid        not null references public.users(id) on delete cascade,

  description   text        not null,
  amount_cents  integer     not null,
  currency      text        not null default 'USD',
  incurred_on   date        not null default current_date,
  notes         text
);

create index if not exists idx_expenses_connection_incurred_on
  on public.expenses(connection_id, incurred_on desc);
create index if not exists idx_expenses_created_by
  on public.expenses(created_by);


-- ==========================================
-- 3) CHECK CONSTRAINTS
-- (added via ALTER TABLE so columns are guaranteed to exist)
-- ==========================================

-- connections: no self-connection
alter table public.connections
  drop constraint if exists connections_no_self;
alter table public.connections
  add constraint connections_no_self check (parent_a <> parent_b);

-- connections: canonical ordering prevents duplicate pairs regardless of direction.
-- The application must ensure parent_a < parent_b before inserting.
alter table public.connections
  drop constraint if exists connections_canonical_order;
alter table public.connections
  add constraint connections_canonical_order check (parent_a < parent_b);

-- connections: inviter must be one of the two parents
alter table public.connections
  drop constraint if exists connections_invited_by_is_member;
alter table public.connections
  add constraint connections_invited_by_is_member
  check (invited_by = parent_a or invited_by = parent_b);

-- connections: valid status values
alter table public.connections
  drop constraint if exists connections_status_valid;
alter table public.connections
  add constraint connections_status_valid
  check (status in ('pending', 'active', 'rejected', 'blocked'));

-- connections: accepted_at must be set when status is active
alter table public.connections
  drop constraint if exists connections_accepted_at_requires_active;
alter table public.connections
  add constraint connections_accepted_at_requires_active
  check (
    (status = 'active' and accepted_at is not null)
    or (status <> 'active')
  );

-- expenses: non-negative amounts
alter table public.expenses
  drop constraint if exists expenses_amount_nonnegative;
alter table public.expenses
  add constraint expenses_amount_nonnegative check (amount_cents >= 0);


-- ==========================================
-- 4) RLS HELPER FUNCTIONS
-- (defined before policies that reference them)
-- ==========================================

-- Returns true if the current user is a member of the given connection
-- (regardless of status — useful for connection-level visibility).
create or replace function public.is_connection_member(p_connection_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.connections c
    where c.id = p_connection_id
      and (auth.uid() = c.parent_a or auth.uid() = c.parent_b)
  );
$$;

-- Returns true only for ACTIVE connections.
-- Used by messages and expenses policies to prevent access to pending connections.
create or replace function public.is_active_connection_member(p_connection_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.connections c
    where c.id = p_connection_id
      and c.status = 'active'
      and (auth.uid() = c.parent_a or auth.uid() = c.parent_b)
  );
$$;


-- ==========================================
-- 5) ENABLE RLS
-- ==========================================
alter table public.users       enable row level security;
alter table public.connections enable row level security;
alter table public.messages    enable row level security;
alter table public.expenses    enable row level security;


-- ==========================================
-- 6) RLS POLICIES
-- ==========================================

-- ---------- USERS ----------

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
on public.users for select
to authenticated
using (id = auth.uid());

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());


-- ---------- CONNECTIONS ----------

-- Members can see their own connections (including pending invites).
drop policy if exists "connections_select_member" on public.connections;
create policy "connections_select_member"
on public.connections for select
to authenticated
using (auth.uid() = parent_a or auth.uid() = parent_b);

-- Parent A can send a pending invite; they must be one of the two parents
-- and the status must start as 'pending'.
drop policy if exists "connections_insert_pending_invite" on public.connections;
create policy "connections_insert_pending_invite"
on public.connections for insert
to authenticated
with check (
  (auth.uid() = parent_a or auth.uid() = parent_b)
  and invited_by = auth.uid()
  and status = 'pending'
);

-- Either parent can update (e.g., Parent B accepts → status = 'active').
drop policy if exists "connections_update_member" on public.connections;
create policy "connections_update_member"
on public.connections for update
to authenticated
using  (auth.uid() = parent_a or auth.uid() = parent_b)
with check (auth.uid() = parent_a or auth.uid() = parent_b);

-- Disallow client-side deletes.
drop policy if exists "connections_delete_none" on public.connections;
create policy "connections_delete_none"
on public.connections for delete
to authenticated
using (false);


-- ---------- MESSAGES (active connections only) ----------

drop policy if exists "messages_select_active_connection_member" on public.messages;
create policy "messages_select_active_connection_member"
on public.messages for select
to authenticated
using (public.is_active_connection_member(connection_id));

drop policy if exists "messages_insert_sender_active_member" on public.messages;
create policy "messages_insert_sender_active_member"
on public.messages for insert
to authenticated
with check (
  public.is_active_connection_member(connection_id)
  and sender_id = auth.uid()
);

drop policy if exists "messages_update_sender_only" on public.messages;
create policy "messages_update_sender_only"
on public.messages for update
to authenticated
using  (sender_id = auth.uid() and public.is_active_connection_member(connection_id))
with check (sender_id = auth.uid() and public.is_active_connection_member(connection_id));

drop policy if exists "messages_delete_none" on public.messages;
create policy "messages_delete_none"
on public.messages for delete
to authenticated
using (false);


-- ---------- EXPENSES (active connections only) ----------

drop policy if exists "expenses_select_active_connection_member" on public.expenses;
create policy "expenses_select_active_connection_member"
on public.expenses for select
to authenticated
using (public.is_active_connection_member(connection_id));

drop policy if exists "expenses_insert_creator_active_member" on public.expenses;
create policy "expenses_insert_creator_active_member"
on public.expenses for insert
to authenticated
with check (
  public.is_active_connection_member(connection_id)
  and created_by = auth.uid()
);

drop policy if exists "expenses_update_creator_only" on public.expenses;
create policy "expenses_update_creator_only"
on public.expenses for update
to authenticated
using  (created_by = auth.uid() and public.is_active_connection_member(connection_id))
with check (created_by = auth.uid() and public.is_active_connection_member(connection_id));

drop policy if exists "expenses_delete_none" on public.expenses;
create policy "expenses_delete_none"
on public.expenses for delete
to authenticated
using (false);
