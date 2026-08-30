# Migrating Tempo to your own GitHub + Supabase + Vercel

This is the runbook for standing up Tempo outside Lovable, on a Supabase project in your
own account, deployed to Vercel. The Lovable Cloud database stays untouched until you have
verified the standalone deployment (final section).

Everything in this repo that the migration needs is already committed:

- `supabase/migrations/*.sql` — the authoritative, ordered schema history (keep using these)
- `supabase/schema.sql` — the same migrations concatenated, for a one-paste bootstrap
- `.env.example` — the exact env var names the app reads

---

## 1. GitHub as source of truth

1. In Lovable, open the GitHub connector and push this project to a repo you own.
2. Clone it locally: `git clone <repo> && cd <repo> && bun install`.
3. From here on, treat the repo as the source of truth. Any future schema change is a new file
   in `supabase/migrations/` committed to the repo, applied with `supabase db push` — never a
   hand-edit in the Supabase SQL editor. That is what keeps schema reproducible.

## 2. Create the Supabase project

Create a new project in your Supabase account. From Project Settings → API, collect:

| Value | Used as |
| --- | --- |
| Project URL | `VITE_SUPABASE_URL` and `SUPABASE_URL` |
| Publishable (or anon) key | `VITE_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_PUBLISHABLE_KEY` |
| Secret (service role) key | `SUPABASE_SERVICE_ROLE_KEY` — server only |

## 3. Recreate the schema

Preferred (keeps migration history in sync with the repo):

```bash
bunx supabase login
bunx supabase link --project-ref <your-project-ref>
bunx supabase db push          # applies supabase/migrations in order
```

Alternative: paste `supabase/schema.sql` into the SQL editor once.

### Verify RLS after applying

Run this in the SQL editor. Every row must show `rowsecurity = true` and a non-zero policy count:

```sql
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       count(p.polname) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public' and c.relkind = 'r'
group by 1,2
order by 1;
```

Expected tables and access rules:

| Table | Rule |
| --- | --- |
| `profiles` | separate view / insert / update / delete policies, each `auth.uid() = id` |
| `scheduling_preferences` | one ALL policy, `auth.uid() = user_id` |
| `tasks` | one ALL policy, `auth.uid() = user_id` |
| `calendar_events` | one ALL policy, `auth.uid() = user_id` |
| `schedule_blocks` | one ALL policy, `auth.uid() = user_id` (rows reference `tasks.id`, store `starts_at`/`ends_at`, `status`, `completed_at`, `actual_minutes`) |
| `integrations` | one ALL policy, `auth.uid() = user_id` |

All policies are granted `TO authenticated` only; `anon` has no table grants, so nothing is
readable without a session. Also confirm the grants and the auth trigger survived:

```sql
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' order by table_name, grantee;

select tgname from pg_trigger where tgname = 'on_auth_user_created';  -- creates a profiles row per new user
```

## 4. Configure Supabase Auth

Authentication → Providers:

- **Email**: enabled. Leave "Confirm email" on (the sign-up screen already handles the
  "check your inbox" state).
- **Google**: enabled, with your own Google Cloud OAuth 2.0 Web client ID + secret pasted in.

In Google Cloud Console → Credentials → your OAuth client:

- **Authorized redirect URI** — exactly one, Supabase's callback:
  `https://<your-project-ref>.supabase.co/auth/v1/callback`
- **Authorized JavaScript origins**: `http://localhost:8080` and `https://<your-domain>`

In Supabase → Authentication → URL Configuration (this is a *separate* list from Google's):

- Site URL: `https://<your-domain>`
- Additional redirect URLs: `http://localhost:8080/**` and `https://<your-domain>/**`

Google's redirect URI points at Supabase; Supabase's allowed redirect URLs point back at your
app. Keeping them separate is what lets one Google client serve both localhost and production.

## 5. No code change needed — the app is dual-mode

`src/routes/auth.tsx` detects where it is running. On Lovable-hosted surfaces (the editor
preview and published `*.lovable.app` sites) it signs in with Google through Lovable's managed
OAuth broker; everywhere else — your Vercel deployment, local dev of the exported repo — it
uses the native `supabase.auth.signInWithOAuth` flow against whichever project your env vars
point at. Both paths land on the same session and post-sign-in routing, so no edits are needed
when deploying standalone.

Nothing else in the app depends on Lovable: `src/lib/lovable-error-reporting.ts` no-ops when
the editor hooks are absent, and the preview session brokering in
`src/integrations/supabase/client.ts` falls back to `localStorage` automatically when the app
is not framed by the Lovable editor — so it works as a plain client without edits.

## 6. Supabase client audit — why each client gets the credentials it gets

**`src/integrations/supabase/client.ts` — browser client, publishable key.**
This module ships in the JS bundle, so the only key it may ever hold is a publishable/anon key.
That key grants nothing on its own: it identifies the project, and every request is then
evaluated as `anon` or, once signed in, as `authenticated` with the user's JWT — so **RLS is
fully in force**. It also persists the session (`persistSession: true`,
`autoRefreshToken: true`) because the browser is where a user session belongs. On Lovable
preview hosts it brokers that session over `postMessage` to the editor; elsewhere it uses
`localStorage`.

**`src/integrations/supabase/client.server.ts` — admin client, secret/service-role key.**
Reads `process.env.SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, which are never exposed to the
bundle (no `VITE_` prefix, and the `.server.ts` filename makes the bundler refuse any
client-side import of this module). The service-role key **bypasses RLS entirely**, so it is
only justified for work RLS cannot express: Auth Admin API calls, maintenance/backfill jobs,
and verified webhook writes. It sets `persistSession: false` — a service client has no user
session to keep.

**Preserving RLS.** The app's normal reads and writes (tasks, calendar events, schedule blocks,
profile, preferences) all go through the browser client or, on the server, through
`requireSupabaseAuth`, which builds a per-request client from the caller's bearer token so RLS
applies as that user. Rule of thumb for future work: reach for the admin client only when you
can name the privileged operation; if the answer is "so the query works", the real fix is a
policy, not the service key. Both clients strip the default `Authorization: Bearer <key>`
header for new-format `sb_*` keys and send them as `apikey`, since those keys are opaque
strings rather than JWTs.

## 7. Deploy to Vercel

1. Import the GitHub repo in Vercel. It is a TanStack Start (Vite) app and
   `vite.config.ts` explicitly selects Nitro's `vercel` preset. Use `bun run build`; no
   output-directory override is needed.
2. Required environment variables (Production **and** Preview), from `.env.example`:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, and
   `SUPABASE_PUBLISHABLE_KEY`.
   `SUPABASE_SERVICE_ROLE_KEY` is only needed if a future trusted server operation imports
   the admin client; the current app does not use it. Keep it server-only if configured and
   never add a `VITE_`-prefixed copy.
3. Deploy, then go back and put the real deployment domain into Supabase's Site URL / redirect
   URLs and Google's authorized origins (step 4).

## 8. Acceptance tests before onboarding anyone

Run against the deployed URL, using two separate accounts:

1. **Email sign-up** → confirmation mail arrives, link lands you in the app.
2. **Profile bootstrap** → `select * from profiles where id = '<uid>'` returns exactly one row.
3. **Google OAuth** → "Continue with Google" completes and returns to the app signed in.
4. **Post-sign-in routing** → new account goes to `/onboarding`, returning account to `/calendar`.
5. **Task creation** → add a task with a due date and one without; both appear after reload.
6. **Schedule blocks** → approve, reschedule, drag, and delete a study block; reload and confirm
   the new times persisted.
7. **Persistence + session** → sign out, sign back in, data is still there.
8. **RLS isolation** → signed in as user B, `select * from tasks` returns only B's rows;
   attempting `update tasks set title='x' where user_id='<A>'` affects 0 rows.
9. **No secret leakage** → search the deployed client bundle for `service_role` / `sb_secret`;
   there must be zero matches.

## 9. Cutover

Leave the Lovable Cloud project running and unmodified until all of step 8 passes on the Vercel
deployment. Only then point users at the new domain. Because no data was copied, existing
Lovable-side accounts do not exist in the new project — anyone testing there signs up again.
