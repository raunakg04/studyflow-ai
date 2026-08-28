# Apply the StudyFlow schema to your external Supabase project

Your Table Editor is empty because no SQL has run against your new project yet. The repo already contains everything needed — nothing has to be written or changed. This is a run-only plan: no code edits, no schema changes.

## What the repo contains (verified)

`supabase/migrations/` has 4 ordered files:

1. `20260822111836_…sql` — `profiles` table (linked to auth users), grants, RLS policies, `set_updated_at()` trigger function, `handle_new_user()` trigger that auto-creates a profile row on signup
2. `20260822111853_…sql` — revokes public execute on those two trigger functions (security hardening)
3. `20260822113542_…sql` — `tasks` and `calendar_events` tables with grants, RLS, updated-at triggers
4. `20260824171203_…sql` — `profiles.timezone` column, `scheduling_preferences`, `schedule_blocks`, `integrations` tables, UTC timestamp columns and indexes on tasks/events, all with grants + RLS

`supabase/schema.sql` is the same 4 files concatenated — a one-paste bootstrap alternative.

## How to apply (choose one)

### Option A — Supabase CLI (recommended, keeps migration history in sync)

In a local clone of the GitHub repo:

```bash
bun install
bunx supabase login
bunx supabase link --project-ref <your-project-ref>   # Settings → General → Reference ID
bunx supabase db push                                  # applies all 4 migrations in order
```

This records each migration in your project's history, so future `supabase db push` runs only apply new files.

### Option B — SQL editor (one paste, no CLI)

1. Open your project in the Supabase dashboard → **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/schema.sql` from the repo.
3. Run it once.

Both paths create the identical schema. Option A is better long-term because it keeps history aligned with the repo.

## Verify afterwards

In the SQL editor, run the RLS check from `docs/standalone-migration.md`:

```sql
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       count(p.polname) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public' and c.relkind = 'r'
group by 1,2 order by 1;
```

Expected result — 6 tables, each with `rls_enabled = true` and at least one policy: `profiles` (4 policies), `tasks`, `calendar_events`, `scheduling_preferences`, `schedule_blocks`, `integrations` (1 policy each). The Table Editor should then show all 6 tables.

Also confirm the signup trigger exists:

```sql
select tgname from pg_trigger where tgname = 'on_auth_user_created';
```

## Follow-up steps (after the schema lands)

- Confirm Vercel env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` point at this new project, then redeploy so the keys are baked into the build.
- Confirm Supabase → Authentication → URL Configuration includes `https://studyflow-ai-rho-blue.vercel.app` as an allowed redirect URL.
- Then run the acceptance checklist in `docs/standalone-migration.md` section 8 (email signup, Google OAuth, task creation, RLS isolation).

## Technical details

- No Lovable Cloud data is copied — your external project starts empty; test accounts sign up fresh there.
- The Lovable Cloud database stays untouched; the Lovable preview keeps using it.
- All 6 tables scope every policy to `auth.uid()`, so users can only ever see their own rows.
