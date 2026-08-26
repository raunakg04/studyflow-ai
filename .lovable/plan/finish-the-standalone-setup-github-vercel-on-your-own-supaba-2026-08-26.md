# Finish the standalone setup: GitHub → Vercel on your own Supabase

Status: GitHub repo linked, your Supabase account exists (empty — schema not applied yet). The workflow you described works: I make changes in Lovable → they sync to GitHub → Vercel redeploys automatically. You keep building in Lovable.

Two things still stand between the current repo and a working live app on your own Supabase:

## What I do in the code (this project)

1. **Dual-mode Google sign-in in `src/routes/auth.tsx`**
   - Today it only uses Lovable's OAuth broker, which doesn't exist outside Lovable, so Google sign-in would break on your Vercel deployment.
   - I'll make it detect the environment: use the Lovable broker inside the Lovable preview (so this project keeps working), and use native `supabase.auth.signInWithOAuth({ provider: "google", redirectTo: window.location.origin })` everywhere else (your Vercel deployment).
   - The Supabase client already reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` from the environment and already falls back to plain localStorage outside the Lovable editor, so no other client changes are needed — Vercel's env vars decide which database the deployed app talks to.

2. **Keep `supabase/migrations/` as the schema source of truth**
   - From now on, whenever you ask for a schema change, I'll apply it to Lovable Cloud (for this preview) AND write the matching migration file into the repo, so `supabase db push` keeps your Supabase in sync.

3. **Continuous GitHub sync (already active, no setup needed)**
   - Lovable's two-way sync is on because the repo is linked: every change made here is auto-committed and pushed to GitHub, and Vercel redeploys on each push. Pushes made directly to GitHub (local IDE, PRs) sync back into this project. No manual push step is ever required.

## What only you can do (your accounts)

3. **Apply the schema to your Supabase project** (currently empty — this is why you see no tables)
   - `bunx supabase link --project-ref <ref>` then `bunx supabase db push`, or paste `supabase/schema.sql` into the SQL editor once.
   - Verify RLS with the check queries in `docs/standalone-migration.md` (every table: `rowsecurity = true`, policy count > 0).

4. **Configure Supabase Auth**
   - Enable Email provider; enable Google with your own Google Cloud OAuth client ID + secret.
   - In Google Cloud Console: authorized redirect URI = `https://<your-ref>.supabase.co/auth/v1/callback` (exactly one).
   - In Supabase URL Configuration: Site URL = your Vercel domain; additional redirect URLs = your domain and `http://localhost:8080/**`.

5. **Set Vercel environment variables** (Production and Preview)
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (mark sensitive; never VITE_-prefixed).

6. **Verify on the live deployment before onboarding anyone** — the acceptance checklist in `docs/standalone-migration.md` section 8: email sign-up, Google OAuth, onboarding vs calendar routing, task/block persistence, RLS isolation between two accounts, no `sb_secret` in the client bundle.

## What stays untouched

- This Lovable project and its Cloud database keep working as your development environment. Nothing is modified or deleted there.
- After cutover, the Lovable Cloud database and your Supabase project are two separate databases; the Lovable preview keeps using Cloud, the Vercel deployment uses yours.

## Technical details

- Dual-mode detection: check whether the Lovable editor/broker is present (e.g. running on a `*.lovable.app` preview host or the editor iframe); fall back to native OAuth otherwise. Preview behavior unchanged.
- No new dependencies. `client.ts` and `client.server.ts` (auto-generated) are not modified.
- Full step-by-step runbook with exact URLs and SQL already lives in `docs/standalone-migration.md`.
