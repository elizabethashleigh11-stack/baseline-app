# baseline-app

Mobile-first baseline app scaffold using **Next.js App Router + Supabase** in a single repository for frontend and backend route handlers.

## Stack

- **Framework:** Next.js 16 (React 19, App Router, TypeScript)
- **Styling:** Tailwind CSS v4
- **Theme palette:** Slate Gray (`#708090`), Navy Blue (`#1B365D`), Crisp White (`#F8FAFC`)
- **Backend in same repo:** App Router Route Handlers (`app/api/.../route.ts`)
- **Database/Auth:** Supabase (Postgres + Supabase Auth + RLS)
- **Hosting target:** Vercel

## Quick setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local env file:

   ```bash
   cp .env.example .env.local
   ```

3. Set values in `.env.local` from Supabase **Project Settings → API**:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. Run SQL migrations in Supabase SQL Editor (in order):

   ```text
   supabase/migrations/0001_init.sql
   supabase/migrations/0002_language_filter_privacy.sql
   supabase/migrations/0003_reflection_export_and_access.sql
   ```

   This creates:
   - `users`
   - `connections`
   - `messages`
   - `message_drafts_private`
   - `user_reflections`
   - moderation/privacy/export helper functions and RLS policies

5. Start development:

   ```bash
   npm run dev
   ```

## Included routes

- `/` Home
- `/login` Magic-link auth screen
- `/app` Protected app page
- `/messages` AI review/send message composer
- `/growth` Private communication trends dashboard (parent portal only)
- `/api/health` Example backend API route (same Next.js project)

## Seeded moderation test flow (Supabase)

### A) SQL seed

```sql
-- 1) Use two existing auth users (replace UUIDs)
--    sender_user_id = '...'
--    receiver_user_id = '...'

insert into public.users (id, display_name, email, portal_type)
values
  ('SENDER_UUID', 'Sender Test', 'sender@test.local', 'parent'),
  ('RECEIVER_UUID', 'Receiver Test', 'receiver@test.local', 'parent')
on conflict (id) do update
set display_name = excluded.display_name,
    email = excluded.email,
    portal_type = excluded.portal_type;

-- 2) Create one active connection (canonical ordering parent_a < parent_b)
insert into public.connections (
  parent_a, parent_b, status, invited_by, invite_code, accepted_at
) values (
  least('SENDER_UUID'::uuid, 'RECEIVER_UUID'::uuid),
  greatest('SENDER_UUID'::uuid, 'RECEIVER_UUID'::uuid),
  'active',
  'SENDER_UUID'::uuid,
  'seed-invite-code-001',
  now()
)
on conflict (invite_code) do nothing;

-- 3) Get connection id for API tests
select id from public.connections where invite_code = 'seed-invite-code-001';
```

### B) Manual API path test

1. `POST /api/messages/review`
   - Body: `{"draftText":"You are awful and never do this"}`
   - Expect: `moderation.flagged = true` and a neutral `suggestedText`
2. `POST /api/messages/send` (blocked raw send)
   - Body: same `draftText`, same `finalText`, plus `connectionId`
   - Expect: `400` with flagged raw-send rejection
3. `POST /api/messages/send` (allowed neutral send)
   - Body: same `draftText`, `finalText = suggestedText`, plus `connectionId`
   - Expect: `200` and `sentMessage` created
4. Verify DB side effects
   - `messages`: neutral `body`, `moderation_applied = true`
   - `message_drafts_private`: private `original_text` + `ai_flag_reason`
   - `user_reflections`: one sender-only reflection row
5. Verify privacy boundaries
   - As sender: `GET /api/reflections/summary` shows sender trend data
   - As receiver: same endpoint shows receiver-owned data only
   - Receiver direct query for sender reflections returns zero rows due to RLS
6. Verify voluntary export
   - As sender in parent portal: `GET /api/reflections/export` returns downloadable JSON report
   - As professional portal user: export endpoint returns `403`

## Deploy to Vercel

1. Import this repository into Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel project env vars.
3. Deploy.
