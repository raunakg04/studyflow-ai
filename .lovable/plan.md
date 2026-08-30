# Direct Google Calendar OAuth for Tempo

Replace the Lovable-connector-based Google path with a direct OAuth 2.0 web-server flow using your own Google Cloud OAuth app. Canvas and everything else stays untouched.

## How it will work

1. In Settings (or onboarding), "Connect Google Calendar" calls a server function that builds a Google consent URL (`access_type=offline`, `prompt=consent`, scope `calendar.readonly`) and a signed, short-lived `state` that identifies the signed-in Tempo user.
2. Google redirects to a server-side callback route on Tempo. The callback verifies the state, exchanges the code for tokens server-side, encrypts and stores the refresh token, runs a first sync, and redirects back to Settings with a success/error flag.
3. Sync fetches the primary calendar plus events for the next weeks and upserts them into `calendar_events` with `source = 'google'` and `external_id = <google event id>`, so repeat syncs update rather than duplicate.
4. Disconnect revokes the token with Google, deletes the stored token row, removes imported Google events, and clears the integration status row.

The client secret and refresh token never leave the server; the browser only ever sees the consent URL and connection status.

## Secrets needed

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

Authorized redirect URI to add in Google Cloud: `https://<your-domain>/api/public/google/oauth/callback` (add both the Vercel production domain and the Lovable preview domain).

## Files to add

- `src/lib/google-oauth.server.ts` — consent URL builder, HMAC-signed state sign/verify, code→token exchange, refresh-token→access-token refresh, token revoke.
- `src/routes/api/public/google.oauth.callback.ts` — server route handling Google's redirect: verify state, exchange code, store token, kick off first sync, redirect to `/settings?google=connected|error`.

## Files to modify

- `src/lib/google-calendar.server.ts` — swap gateway calls (`callAsAppUser`) for direct Google Calendar API calls with a bearer access token derived from the stored refresh token; change the sync from delete-all-and-insert to an upsert keyed on `(user_id, source, external_id)` so Google event IDs de-duplicate.
- `src/lib/integrations.functions.ts` — `startGoogleConnect` returns the Google consent URL; drop `completeGoogleConnect` gateway exchange; `disconnectGoogleCalendar` revokes and deletes the direct token. `getIntegrations` reports `googleConfigured` from the presence of the Google client ID/secret.
- `src/lib/integrations-store.ts` — connect mutation redirects the browser to the consent URL instead of running a popup exchange; refresh status when returning with `?google=connected`.
- `src/routes/settings.tsx` — read the `?google=` return flag and refresh/toast; existing Connected / Sync now / Disconnect UI stays as is.
- `src/routes/oauth.google-calendar.return.tsx` — removed (popup/gateway-specific).
- `supabase/schema.sql` — document the unique index below.

## Database change

One migration: a unique index on `calendar_events (user_id, source, external_id)` where `external_id is not null`, so Google event IDs upsert cleanly. No new tables — refresh tokens reuse the existing encrypted `app_user_connections` table with `connector_id = 'google_oauth'` (service-role only, already RLS-locked).

## Out of scope

Canvas, tasks, calendar UI behavior, auth pages.
