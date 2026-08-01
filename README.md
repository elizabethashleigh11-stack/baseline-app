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

4. Run the SQL migration in Supabase SQL Editor:

   ```text
   supabase/migrations/0001_init.sql
   ```

   This creates:
   - `users`
   - `connections`
   - `messages`
   - RLS policies and helper functions

5. Start development:

   ```bash
   npm run dev
   ```

## Included routes

- `/` Home
- `/login` Magic-link auth screen
- `/app` Protected app page
- `/messages` AI review/send message composer
- `/growth` Private communication trends dashboard
- `/api/health` Example backend API route (same Next.js project)

## Deploy to Vercel

1. Import this repository into Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel project env vars.
3. Deploy.
