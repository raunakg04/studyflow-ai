# Calendar persistence audit — root cause and fix

## What I verified

- Calendar blocks are **not** hardcoded at render time. They come from the `calendar_events` table via `useCalendarEvents()` in `src/lib/data-store.ts`. The 15 rows in the database are the starter set that was seeded into the account on first load (all created 2026-08-24), and the page reads them correctly.
- The signed-in account can read its rows (confirmed live in the preview) and **can** write: a manual update against a real row from the browser client succeeded with no RLS or permission error. So RLS, grants, and the row id are all fine.
- Every row's `updated_at` still equals its `created_at`, i.e. no edit from the app has ever reached the database.
- Reproducing an edit in the running preview (open a block → Edit → change the title) produced **zero network requests** to `calendar_events`. The UI state changed, nothing was sent.

## Root cause

In `src/lib/data-store.ts`, every write except the initial seed is issued as a discarded expression:

```ts
void supabase.from("calendar_events").update(row).eq("id", id);
```

A Supabase query builder is lazy — it only sends the HTTP request when it is awaited or `.then()` is called. `void ...` never awaits it, so the request is **built and thrown away**. The seed inserts use `await`, which is exactly why the synthetic rows exist while nothing else persists.

Consequence: create, edit, move (drag), approve, approve-all, and delete all mutate React state only. The change looks applied until the next refetch (page navigation, auth event, or the `tempo:data-synced` refresh after an integration sync), at which point the untouched database rows overwrite it — the "reverts / disappears" symptom. The same bug affects tasks (`addTask`, `updateTask`, `removeTask`).

## Fix

All changes in `src/lib/data-store.ts`; the calendar page needs no behavioural change.

1. Make every mutation an awaited async operation instead of `void`:
   - `useCalendarEvents`: `addEvent`, `updateEvent`, `setKindMany`, `removeEvent`
   - `useTasks`: `addTask`, `updateTask`, `removeTask`
2. Move the Supabase call **out of the `setState` updater**. Today the write is a side effect inside the updater function, which React may invoke more than once. Compute the next row from a ref-held copy of current state, update state optimistically, then perform the awaited write.
3. Check `error` on every response. On failure, roll the optimistic state back to the previous value and surface a toast (sonner) so a rejected write is visible instead of silently reverting later.
4. For updates, send only the changed columns (mapped patch) rather than the whole row including `id`/`user_id`, so an edit can never rewrite ownership fields.
5. Keep the refetch-on-`tempo:data-synced` behaviour — with writes landing, a refetch now returns the user's own change rather than clobbering it.

Out of scope for this fix: the `schedule_blocks` table is not yet used by the calendar UI (blocks are stored in `calendar_events`); migrating to it is a separate change.

## Verification after implementing

- Edit a title, drag a block, add an event, approve a suggestion, delete a block — each should produce a PATCH/POST/DELETE to `calendar_events`.
- Re-query the table and confirm `updated_at` advances and values match the UI.
- Reload the page and confirm the changes survive.
