import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getConnectionKeyForUser } from "@/lib/app-user-connections.server";
import { writeStatus } from "@/lib/integration-status.server";

type Client = SupabaseClient<Database>;

export const CANVAS_CONNECTOR_ID = "canvas";

/**
 * Canvas calendar feed (iCal) support. Students whose admins block personal
 * access tokens can still export a read-only calendar feed from Canvas:
 * Calendar → Calendar Feed → copy the webcal:// link.
 */
export function normalizeCanvasFeedUrl(input: string) {
  const raw = input.trim().replace(/^webcal:\/\//i, "https://");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Enter the full Canvas calendar feed link (it ends in .ics)");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Enter the full Canvas calendar feed link (it ends in .ics)");
  }
  if (!/\.ics$/i.test(url.pathname)) {
    throw new Error(
      "That doesn't look like a Canvas calendar feed. In Canvas open Calendar → Calendar Feed and copy the link ending in .ics",
    );
  }
  return url.toString();
}

export function canvasFeedHost(feedUrl: string) {
  try {
    return new URL(feedUrl).hostname;
  } catch {
    return "canvas";
  }
}

async function fetchFeed(feedUrl: string) {
  const res = await fetch(feedUrl, { headers: { Accept: "text/calendar, text/plain" } });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Canvas rejected the calendar feed (${res.status}). Copy a fresh feed link from Canvas and reconnect.`,
    );
  }
  if (!text.includes("BEGIN:VCALENDAR")) {
    throw new Error("That link didn't return a calendar feed. Copy the .ics link from Canvas.");
  }
  return text;
}

type ICalEvent = Record<string, string>;

function unfold(raw: string) {
  return raw.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function unescapeText(value: string) {
  return value
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseICalDate(value: string): Date | null {
  const v = value.trim();
  const utc = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/.exec(v);
  if (utc) {
    return new Date(
      Date.UTC(+utc[1]!, +utc[2]! - 1, +utc[3]!, +utc[4]!, +utc[5]!, +utc[6]!),
    );
  }
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (dateOnly) {
    return new Date(Date.UTC(+dateOnly[1]!, +dateOnly[2]! - 1, +dateOnly[3]!, 23, 59, 0));
  }
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseICal(raw: string): ICalEvent[] {
  const lines = unfold(raw).split("\n");
  const events: ICalEvent[] = [];
  let current: ICalEvent | null = null;
  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = {};
      continue;
    }
    if (line.startsWith("END:VEVENT")) {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const rawKey = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const key = rawKey.split(";")[0]!.toUpperCase();
    current[key] = value;
  }
  return events;
}

function bucketFor(due: Date | null): "today" | "week" | "later" {
  if (!due) return "later";
  const days = (due.getTime() - Date.now()) / 86_400_000;
  if (days <= 1) return "today";
  if (days <= 7) return "week";
  return "later";
}

function dueLabelFor(due: Date | null) {
  if (!due) return "";
  return `Due ${due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}, ${due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

/** Canvas summaries look like "Essay draft [ENGL 201 Fall]". */
function splitSummary(summary: string) {
  const match = /^(.*?)\s*\[([^\]]+)\]\s*$/.exec(summary);
  if (match) return { title: match[1]!.trim() || "Canvas assignment", course: match[2]!.trim() };
  return { title: summary.trim() || "Canvas assignment", course: "Canvas" };
}

export async function canvasFeedLabel(feedUrl: string) {
  const raw = await fetchFeed(feedUrl);
  const name = /(?:^|\n)X-WR-CALNAME:(.*)/i.exec(unfold(raw).replace(/\r/g, ""));
  return name?.[1] ? unescapeText(name[1]) : `Canvas feed (${canvasFeedHost(feedUrl)})`;
}

export async function syncCanvasForUser(supabase: Client, userId: string) {
  const feedUrl = await getConnectionKeyForUser(userId, CANVAS_CONNECTOR_ID);
  if (!feedUrl) throw new Error("Canvas is not connected");

  const raw = await fetchFeed(feedUrl);
  const parsed = parseICal(raw);

  const cutoffPast = Date.now() - 2 * 86_400_000;
  const cutoffFuture = Date.now() + 120 * 86_400_000;

  const incoming: {
    externalId: string;
    title: string;
    courseName: string;
    due: Date | null;
  }[] = [];

  for (const event of parsed) {
    const summary = event["SUMMARY"] ? unescapeText(event["SUMMARY"]) : "";
    if (!summary) continue;
    const dtRaw = event["DTSTART"] ?? event["DUE"] ?? event["DTEND"];
    const due = dtRaw ? parseICalDate(dtRaw) : null;
    if (due && (due.getTime() < cutoffPast || due.getTime() > cutoffFuture)) continue;
    const uid = event["UID"]?.trim();
    const { title, course } = splitSummary(summary);
    incoming.push({
      externalId: uid || `feed:${title}:${due?.toISOString() ?? "none"}`,
      title,
      courseName: course,
      due,
    });
  }

  const { data: existing } = await supabase
    .from("tasks")
    .select("id, external_id")
    .eq("source", "canvas");
  const byExternal = new Map((existing ?? []).map((t) => [t.external_id, t.id]));

  const inserts: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const item of incoming) {
    if (seen.has(item.externalId)) continue;
    seen.add(item.externalId);
    const shared = {
      title: item.title,
      due: item.due ? item.due.toISOString().slice(0, 10) : null,
      due_at: item.due ? item.due.toISOString() : null,
      due_label: dueLabelFor(item.due),
      bucket: bucketFor(item.due),
    };
    const id = byExternal.get(item.externalId);
    if (id) {
      // Keep the student's local edits (status, subtasks, effort) intact.
      await supabase.from("tasks").update(shared).eq("id", id);
    } else {
      inserts.push({
        ...shared,
        user_id: userId,
        course: "life",
        effort_hours: 1,
        status: "todo",
        source: "canvas",
        description: item.courseName,
        external_id: item.externalId,
        subtasks: [],
        suggestions: [],
      });
    }
  }

  if (inserts.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("tasks").insert(inserts as any);
    if (error) throw error;
  }

  await writeStatus(supabase, userId, "canvas", {
    status: "connected",
    lastSyncedAt: new Date().toISOString(),
    lastSyncError: null,
  });

  return { imported: inserts.length, updated: seen.size - inserts.length };
}
