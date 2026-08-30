import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getConnectionKeyForUser } from "@/lib/app-user-connections.server";
import { accessTokenFromRefresh, GOOGLE_CONNECTOR_ID } from "@/lib/google-oauth.server";
import { writeStatus } from "@/lib/integration-status.server";

export { GOOGLE_CONNECTOR_ID };

const API_BASE = "https://www.googleapis.com/calendar/v3";

type Client = SupabaseClient<Database>;

type GCalEvent = {
  id: string;
  summary?: string;
  location?: string;
  description?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

/** Weekday index with Monday = 0, from a "YYYY-MM-DD" string (offset free). */
function weekdayIndex(datePart: string) {
  const [y, m, d] = datePart.split("-").map(Number);
  const js = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
  return (js + 6) % 7;
}

/** Decimal hour from the local wall-clock part of an RFC3339 timestamp. */
function hourOf(dateTime: string) {
  const match = /T(\d{2}):(\d{2})/.exec(dateTime);
  if (!match) return 9;
  return Number(match[1]) + Number(match[2]) / 60;
}

async function gcal(accessToken: string, path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Google Calendar request failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return JSON.parse(text || "{}");
}

export async function googleAccessToken(userId: string) {
  const refreshToken = await getConnectionKeyForUser(userId, GOOGLE_CONNECTOR_ID);
  if (!refreshToken) throw new Error("Google Calendar is not connected");
  return accessTokenFromRefresh(refreshToken);
}

export async function googleAccountLabel(accessToken: string) {
  const list = (await gcal(accessToken, "/users/me/calendarList")) as {
    items?: { id: string; primary?: boolean; summary?: string }[];
  };
  const primary = list.items?.find((c) => c.primary) ?? list.items?.[0];
  return primary?.id ?? primary?.summary ?? "Google account";
}

export async function syncGoogleCalendarForUser(supabase: Client, userId: string) {
  const accessToken = await googleAccessToken(userId);

  const list = (await gcal(accessToken, "/users/me/calendarList")) as {
    items?: { id: string; primary?: boolean; selected?: boolean; summary?: string }[];
  };
  const calendars = (list.items ?? [])
    .filter((c) => c.primary || c.selected !== false)
    .slice(0, 5);

  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const until = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
  const timeMin = encodeURIComponent(from.toISOString());
  const timeMax = encodeURIComponent(until.toISOString());

  const rows: Record<string, unknown>[] = [];
  const seen = new Set<string>();

  for (const cal of calendars) {
    const data = (await gcal(
      accessToken,
      `/calendars/${encodeURIComponent(cal.id)}/events` +
        `?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`,
    )) as { items?: GCalEvent[] };

    for (const ev of data.items ?? []) {
      if (ev.status === "cancelled") continue;
      const startISO = ev.start?.dateTime;
      const endISO = ev.end?.dateTime;
      // All-day events have no wall-clock slot in the week grid — skip them.
      if (!startISO || !endISO) continue;
      const externalId = `${cal.id}:${ev.id}`;
      if (seen.has(externalId)) continue;
      seen.add(externalId);

      const datePart = startISO.slice(0, 10);
      const start = hourOf(startISO);
      const end = Math.max(hourOf(endISO), start + 0.25);

      rows.push({
        user_id: userId,
        title: ev.summary?.trim() || "Busy",
        course: "life",
        day: weekdayIndex(datePart),
        start_hour: start,
        end_hour: end,
        kind: "fixed",
        rationale: `Imported from ${cal.summary ?? "Google Calendar"}.`,
        location: ev.location ?? "",
        notes: (ev.description ?? "").slice(0, 500),
        source: "google",
        external_id: externalId,
        starts_at: new Date(startISO).toISOString(),
        ends_at: new Date(endISO).toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (rows.length) {
    const { error } = await supabase
      .from("calendar_events")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(rows as any, { onConflict: "user_id,source,external_id" });
    if (error) throw error;
  }

  // Drop previously imported events that no longer exist in Google.
  const keep = Array.from(seen);
  let stale = supabase
    .from("calendar_events")
    .delete()
    .eq("user_id", userId)
    .eq("source", "google");
  if (keep.length) {
    stale = stale.not("external_id", "in", `(${keep.map((id) => `"${id}"`).join(",")})`);
  }
  await stale;

  const label = await googleAccountLabel(accessToken);
  await writeStatus(supabase, userId, "google_calendar", {
    status: "connected",
    accountLabel: label,
    lastSyncedAt: new Date().toISOString(),
    lastSyncError: null,
  });

  return { imported: rows.length };
}
