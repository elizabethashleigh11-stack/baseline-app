# Baseline

Co-parenting communication and expense tracking — built on **Next.js** (App Router, TypeScript) and **Supabase**.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, TypeScript) |
| Auth | Supabase Auth — Email Magic Link |
| Database | Supabase (PostgreSQL + Row-Level Security) |
| Hosting | Any platform that supports Node.js (Vercel, Railway, etc.) |

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Copy the example file and fill in your Supabase project credentials:

```bash
cp .env.example .env.local
```

Open `.env.local` and set:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Both values are found in your Supabase dashboard under **Project Settings → API**.

### 3. Run the database migration

Open the **Supabase SQL Editor** for your project and paste the contents of:

```
supabase/migrations/0001_init.sql
```

This creates the `users`, `connections`, `messages`, and `expenses` tables, helper functions, and all Row-Level Security policies.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Pages

| Route | Description |
|---|---|
| `/` | Home — links to sign-in and dashboard |
| `/login` | Email magic-link sign-in form |
| `/app` | Protected dashboard (server-side auth check; redirects to `/login` if not signed in) |

---

## How the Pending Invite model works

Baseline uses an **invite-code flow** to link two co-parents before any shared data can be exchanged:

1. **Parent A** creates a `connections` row with `status = 'pending'` and a unique `invite_code`.  The `invited_by` field is set to Parent A's user ID.
2. **Parent A** shares the `invite_code` out-of-band (e.g., SMS/email) with Parent B.
3. **Parent B** looks up the connection by `invite_code` and, if the code is valid and not expired, updates the row:
   - `status` → `'active'`
   - `accepted_at` → `now()`
4. Once the connection is `active`, both parents can send messages and log expenses that are scoped to that connection.

### Data isolation guarantees

- The `connections_canonical_order` constraint (`parent_a < parent_b`) prevents duplicate connection rows for the same pair.
- All `messages` and `expenses` rows reference a `connection_id`, and the RLS helper `is_active_connection_member()` ensures only members of an **active** connection can read or write that data.
- No data leaks across co-parent pairs — every query is scoped to a single connection.

---

## Project structure

```
app/
  layout.tsx          Root layout
  page.tsx            Home page
  login/
    page.tsx          Magic-link sign-in (client component)
  app/
    page.tsx          Protected dashboard (server component)
lib/
  supabase/
    client.ts         Browser Supabase client
    server.ts         Server-side Supabase client (cookie-based session)
supabase/
  migrations/
    0001_init.sql     Initial schema, RLS policies
.env.example          Required environment variables
```
