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

4. Run the SQL migrations in Supabase SQL Editor:

   ```text
   supabase/migrations/0001_init.sql
   supabase/migrations/0002_reflections.sql
   ```

   This creates:
   - `users`
   - `connections`
   - `messages`
   - `reflections`
   - RLS policies and helper functions

5. Start development:

   ```bash
   npm run dev
   ```

## Included routes

- `/` Home
- `/login` Magic-link auth screen
- `/app` Protected app page
- `/api/health` Example backend API route (same Next.js project)
- `/api/reflections` Authenticated reflection autosave route

## Deploy to Vercel

1. Import this repository into Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel project env vars.
3. Deploy.

## Scheduled Supabase wake-up

This repo includes `.github/workflows/wake-up-supabase.yml`, which checks at 10:00/11:00 UTC and sends the wake-up ping at 6:00 AM America/New_York every 6 days (and can be run manually from **Actions**).

Manual runs from **Actions** always send a wake-up ping immediately (they bypass the 6-day interval window).

Set these repository settings in GitHub:

- **Variables** → `WAKE_UP_URL` (your deployed endpoint, for example `https://your-app.vercel.app/api/health`)
- **Variables** (optional) → `WAKE_UP_ANCHOR_DATE` (`YYYY-MM-DD`; defaults to `2026-01-01` and controls the 6-day cycle anchor)
- **Secrets** (optional) → `WAKE_UP_KEY` (only if your endpoint expects an `x-wake-key` header)
