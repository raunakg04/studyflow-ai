import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getConnectionKeyForUser } from "@/lib/app-user-connections.server";
import { writeStatus } from "@/lib/integration-status.server";

type Client = SupabaseClient<Database>;

export const CANVAS_CONNECTOR_ID = "canvas";

export function normalizeCanvasDomain(input: string) {
  const trimmed = input.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const host = trimmed.split("/")[0] ?? "";
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) {
    throw new Error("Enter a valid Canvas address, like canvas.university.edu");
  }
  return host.toLowerCase();
}

async function canvasFetch<T>(domain: string, token: string, path: string): Promise<T> {
  const res = await fetch(`https://${domain}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Canvas rejected the access token. Generate a new one and reconnect.");
    }
    throw new Error(`Canvas request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return JSON.parse(text || "null") as T;
}

export async function canvasUserName(domain: string, token: string) {
  const me = await canvasFetch<{ name?: string; short_name?: string }>(
    domain,
    token,
    "/api/v1/users/self",
  );
  return me?.name || me?.short_name || "Canvas account";
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

export async function syncCanvasForUser(supabase: Client, userId: string) {
  const token = await getConnectionKeyForUser(userId, CANVAS_CONNECTOR_ID);
  if (!token) throw new Error("Canvas is not connected");

  const { data: integration } = await supabase
    .from("integrations")
    .select("settings")
    .eq("provider", CANVAS_CONNECTOR_ID)
    .maybeSingle();
  const domain = ((integration?.settings ?? {}) as { domain?: string }).domain;
  if (!domain) throw new Error("Canvas school address is missing. Reconnect Canvas.");

  const courses = await canvasFetch<{ id: number; name?: string }[]>(
    domain,
    token,
    "/api/v1/courses?enrollment_state=active&per_page=50",
  );

  type Assignment = {
    id: number;
    name?: string;
    due_at?: string | null;
    html_url?: string;
    description?: string | null;
  };

  const incoming: {
    externalId: string;
    title: string;
    courseName: string;
    due: Date | null;
  }[] = [];

  for (const course of (courses ?? []).slice(0, 20)) {
    let assignments: Assignment[] = [];
    try {
      assignments = await canvasFetch<Assignment[]>(
        domain,
        token,
        `/api/v1/courses/${course.id}/assignments?bucket=upcoming&per_page=50`,
      );
    } catch {
      continue; // A single locked course shouldn't fail the whole sync.
    }
    for (const a of assignments ?? []) {
      incoming.push({
        externalId: `${course.id}:${a.id}`,
        title: a.name?.trim() || "Canvas assignment",
        courseName: course.name?.trim() || "Canvas",
        due: a.due_at ? new Date(a.due_at) : null,
      });
    }
  }

  const { data: existing } = await supabase
    .from("tasks")
    .select("id, external_id")
    .eq("source", "canvas");
  const byExternal = new Map((existing ?? []).map((t) => [t.external_id, t.id]));

  const inserts: Record<string, unknown>[] = [];
  for (const item of incoming) {
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

  return { imported: inserts.length, updated: incoming.length - inserts.length };
}
