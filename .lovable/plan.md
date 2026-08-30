# Google Calendar + Canvas integration

Bring real obligations into Tempo: read events from each student's Google Calendar and assignments from their Canvas account, then show them on the calendar and tasks pages alongside AI study blocks.

## What the student sees

**Settings → Connections** becomes real (today the two buttons only flip a local flag):

- **Google Calendar** — "Connect" opens a Google consent popup. Once connected it shows the Google account email, last synced time, a "Sync now" button, and "Disconnect".
- **Canvas** — "Connect" opens a small dialog asking for the school's Canvas URL (e.g. `canvas.school.edu`) and a personal access token, with a short line on where to generate the token (Canvas → Account → Settings → New Access Token). After saving it shows the Canvas user name, last synced time, "Sync now" and "Disconnect".
- Failed syncs show a plain-language error on the card.

**Onboarding** connect step gets the same two real controls, with skip still allowed.

**Calendar page** — imported Google events render as fixed (non-editable) bubbles marked with a small "Google" tag, so AI study blocks schedule around them. A "Sync" action in the calendar header refreshes both sources; the page also refreshes on load when the last sync is stale.

**Tasks page** — Canvas assignments appear as tasks with the course name, due date, and a "Canvas" badge. Completed-in-Canvas assignments are marked done. Students can still edit them locally; re-syncing won't clobber their edits (only due date/title from Canvas are refreshed).

Read-only for now: nothing Tempo creates is pushed back to Google or Canvas.

## Technical approach

**Google Calendar** uses the Lovable App User Connector (`google_calendar`), so each student authorizes their own account:
- Link the workspace OAuth client to the project, scopes `userinfo.email`, `userinfo.profile`, `calendar.readonly`.
- New server-only table `app_user_connections` (service-role only, RLS on) storing each user's connection key encrypted with `APP_USER_CONNECTION_KEY_SECRET`.
- Server functions in `src/lib/integrations.functions.ts`: start consent, exchange the OAuth callback code, sync, disconnect. Callback handled at a public route `/auth/connector-callback`.
- Sync reads `calendarList` + `events` for the next 30 days and upserts into `calendar_events` with `source = 'google'` and `external_id` (existing columns), deleting google-sourced rows that vanished upstream.

**Canvas** uses domain + personal access token:
- Token stored encrypted (same crypto helper) in the existing `integrations` table row for `provider = 'canvas'`; the plaintext token never reaches the browser after saving.
- Server function calls Canvas REST from the server (`/api/v1/users/self`, `/api/v1/users/self/todo` and `/api/v1/courses?enrollment_state=active` + per-course `assignments`), upserting into `tasks` with `source = 'canvas'` and `external_id`, mapping due date → `due_at`/`due`, course name → `course`.

**Shared**: both syncs update the `integrations` row (`status`, `account_label`, `last_synced_at`, `last_sync_error`). A `src/lib/integrations-store.ts` hook exposes connection state to Settings, onboarding, calendar, and tasks.

**Deployment note**: the Google connector runs through Lovable's connector gateway, which injects its client key and encryption secret into the Lovable-hosted runtime. On the Vercel/GitHub deployment those same env vars have to be copied into Vercel or the Google connect button will fail there; Canvas works anywhere. I'll list the exact variable names once the connector client is linked.
