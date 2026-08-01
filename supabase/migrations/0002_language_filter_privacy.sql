-- ==========================================
-- 0002_language_filter_privacy.sql
-- AI language filter privacy and reflection tracking
-- ==========================================

-- ==========================================
-- 1) MESSAGES EXTENSIONS (non-sensitive fields only)
-- ==========================================
alter table public.messages
  add column if not exists moderation_applied boolean not null default false,
  add column if not exists moderated_at timestamptz;

create index if not exists idx_messages_moderation_applied
  on public.messages(moderation_applied);

-- ==========================================
-- 2) PRIVATE FLAGGED DRAFTS (sender-only)
-- ==========================================
create table if not exists public.message_drafts_private (
  id                 uuid        primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  message_id         uuid        not null unique references public.messages(id) on delete cascade,
  user_id            uuid        not null references public.users(id) on delete cascade,
  original_text      text        not null,
  ai_flag_reason     text        not null,
  emotional_category text        not null
);

create index if not exists idx_message_drafts_private_user_created_at
  on public.message_drafts_private(user_id, created_at desc);

-- ==========================================
-- 3) USER REFLECTIONS (sender-only trends)
-- ==========================================
create table if not exists public.user_reflections (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  category   text        not null,
  created_at timestamptz not null default now(),
  constraint user_reflections_category_valid check (
    category in ('offensive', 'manipulative', 'explicit', 'hostile', 'profanity', 'other')
  )
);

create index if not exists idx_user_reflections_user_created_at
  on public.user_reflections(user_id, created_at desc);

create index if not exists idx_user_reflections_user_category
  on public.user_reflections(user_id, category);

-- ==========================================
-- 4) RLS HELPERS
-- ==========================================
create or replace function public.is_message_sender(p_message_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.messages m
    where m.id = p_message_id
      and m.sender_id = auth.uid()
  );
$$;

-- ==========================================
-- 5) ENABLE RLS
-- ==========================================
alter table public.message_drafts_private enable row level security;
alter table public.user_reflections      enable row level security;

-- ==========================================
-- 6) RLS POLICIES: message_drafts_private (strict sender-only)
-- ==========================================
drop policy if exists "message_drafts_private_select_own" on public.message_drafts_private;
create policy "message_drafts_private_select_own"
on public.message_drafts_private for select
 to authenticated
using (user_id = auth.uid());

drop policy if exists "message_drafts_private_insert_own" on public.message_drafts_private;
create policy "message_drafts_private_insert_own"
on public.message_drafts_private for insert
 to authenticated
with check (
  user_id = auth.uid()
  and public.is_message_sender(message_id)
);

drop policy if exists "message_drafts_private_update_none" on public.message_drafts_private;
create policy "message_drafts_private_update_none"
on public.message_drafts_private for update
 to authenticated
using (false)
with check (false);

drop policy if exists "message_drafts_private_delete_none" on public.message_drafts_private;
create policy "message_drafts_private_delete_none"
on public.message_drafts_private for delete
 to authenticated
using (false);

-- ==========================================
-- 7) RLS POLICIES: user_reflections (strict user-only)
-- ==========================================
drop policy if exists "user_reflections_select_own" on public.user_reflections;
create policy "user_reflections_select_own"
on public.user_reflections for select
 to authenticated
using (user_id = auth.uid());

drop policy if exists "user_reflections_insert_own" on public.user_reflections;
create policy "user_reflections_insert_own"
on public.user_reflections for insert
 to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_reflections_update_none" on public.user_reflections;
create policy "user_reflections_update_none"
on public.user_reflections for update
 to authenticated
using (false)
with check (false);

drop policy if exists "user_reflections_delete_none" on public.user_reflections;
create policy "user_reflections_delete_none"
on public.user_reflections for delete
 to authenticated
using (false);
