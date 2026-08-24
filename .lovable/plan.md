# Migrate StudyFlow to your own Supabase account + your own hosting

Goal: run StudyFlow outside Lovable, against a Supabase project in your own account (your data, your billing). Schema is recreated fresh; no data is copied.

Important: Lovable Cloud cannot be detached from this project inside Lovable. The migration path is to export the code and point that exported copy at your own Supabase project. This project in Lovable keeps using Cloud.

## Steps

1. Export the code
   - Connect GitHub from the Lovable sidebar and push this project to a repo you own, then clone it locally.

2. Create your Supabase project
   - Create a project in your own Supabase account, note its URL, publishable/anon key, and service role key.

3. Recreate the schema
   - The repo already contains 4 SQL migration files under `supabase/migrations/`. Apply them in filename order via the Supabase SQL editor or the Supabase CLI (`supabase link` + `supabase db push`).
   - This recreates: `profiles`, `scheduling_preferences`, `tasks`, `calendar_events`, `schedule_blocks`, `integrations`, the `handle_new_user` / `set_updated_at` functions and triggers, all row-level-security policies, and grants.

4. Configure auth
   - Enable Email provider.
   - Enable Google provider with your own Google Cloud OAuth client (client ID + secret), and add your Supabase callback URL as an authorized redirect URI.
   - Set Site URL and Redirect URLs to your deployed domain plus `http://localhost:8080` for local dev.

5. Swap out the two Lovable-managed pieces in the code
   - `src/routes/auth.tsx` currently signs in with Google via the Lovable OAuth broker (`lovable.auth.signInWithOAuth`). Replace with `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`.
   - `src/integrations/supabase/client.ts` contains Lovable preview session brokering (postMessage across preview iframes). Replace with a plain `createClient` using `localStorage`.
   - `src/lib/lovable-error-reporting.ts` hooks are inert outside Lovable; can stay or be stripped.

6. Environment variables
   - Local `.env` and your host's env settings need: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (server-side only, used by `src/integrations/supabase/client.server.ts`).

7. Deploy
   - The app is TanStack Start on Vite, targeting an edge runtime. Cloudflare Workers or Vercel both work; build with `bun run build` and deploy the server output. Add the env vars from step 6 to the host, then update Supabase Site URL / Redirect URLs to the live domain.

8. Verify
   - Sign up with email, confirm a `profiles` row is auto-created, run Google sign-in, create a task and a calendar block, then sign out and back in to confirm data persists under your account.

## What I can do here vs. what only you can do

I can do inside this project (if you want): prepare the code changes from step 5 behind env-var detection so the exported copy works standalone, and produce a single consolidated `schema.sql` you can paste into your Supabase SQL editor.

Only you can do: create the Supabase project, create the Google OAuth client, hold the keys, and deploy to your host — Lovable has no access to your external account.

## Notes

- No data or auth users are copied, per your choice; everyone signs up again on the new project.
- After the switch, this Lovable project and your external project are two separate databases; changes in one do not appear in the other.
