import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  events as seedEvents,
  tasks as seedTasks,
  type CalendarEvent,
  type CourseId,
  type Task,
} from "@/lib/mock-data";

/* ---------------- tasks ---------------- */

type TaskRow = {
  id: string;
  title: string;
  course: string;
  due: string | null;
  due_label: string;
  bucket: string;
  effort_hours: number | string;
  status: string;
  source: string;
  description: string;
  subtasks: unknown;
  suggestions: unknown;
};

const TASK_COLUMNS =
  "id, title, course, due, due_label, bucket, effort_hours, status, source, description, subtasks, suggestions";

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    course: (row.course || "life") as CourseId,
    due: row.due ?? "",
    dueLabel: row.due_label ?? "",
    bucket: (row.bucket || "later") as Task["bucket"],
    effortHours: Number(row.effort_hours ?? 1),
    status: (row.status || "todo") as Task["status"],
    source: (row.source || "manual") as Task["source"],
    description: row.description ?? "",
    subtasks: Array.isArray(row.subtasks) ? (row.subtasks as Task["subtasks"]) : [],
    suggestions: Array.isArray(row.suggestions) ? (row.suggestions as Task["suggestions"]) : [],
  };
}

function taskToRow(task: Task, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    course: task.course,
    due: task.due || null,
    due_label: task.dueLabel,
    bucket: task.bucket,
    effort_hours: task.effortHours,
    status: task.status,
    source: task.source,
    description: task.description,
    subtasks: task.subtasks,
    suggestions: task.suggestions,
  };
}

type TaskUpdate = Partial<ReturnType<typeof taskToRow>>;

function taskPatchToRow(patch: Partial<Task>) {
  const row: TaskUpdate = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.course !== undefined) row.course = patch.course;
  if (patch.due !== undefined) row.due = patch.due || null;
  if (patch.dueLabel !== undefined) row.due_label = patch.dueLabel;
  if (patch.bucket !== undefined) row.bucket = patch.bucket;
  if (patch.effortHours !== undefined) row.effort_hours = patch.effortHours;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.source !== undefined) row.source = patch.source;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.subtasks !== undefined) row.subtasks = patch.subtasks;
  if (patch.suggestions !== undefined) row.suggestions = patch.suggestions;
  return row;
}

/* ---------------- events ---------------- */

type EventRow = {
  id: string;
  title: string;
  course: string;
  day: number;
  start_hour: number | string;
  end_hour: number | string;
  kind: string;
  rationale: string;
  notes: string | null;
  source: string | null;
};

const EVENT_COLUMNS =
  "id, title, course, day, start_hour, end_hour, kind, rationale, notes, source";

function rowToEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    course: (row.course || "life") as CourseId,
    day: Number(row.day ?? 0),
    start: Number(row.start_hour ?? 9),
    end: Number(row.end_hour ?? 10),
    kind: (row.kind || "study") as CalendarEvent["kind"],
    rationale: row.rationale ?? "",
    notes: row.notes ?? "",
    source: row.source === "google" ? "google" : "manual",
  };
}

function eventToRow(event: CalendarEvent, userId: string) {
  return {
    id: event.id,
    user_id: userId,
    title: event.title,
    course: event.course,
    day: event.day,
    start_hour: event.start,
    end_hour: event.end,
    kind: event.kind,
    rationale: event.rationale,
    notes: event.notes ?? "",
    source: event.source ?? "manual",
  };
}

type EventUpdate = Partial<ReturnType<typeof eventToRow>>;

function eventPatchToRow(patch: Partial<CalendarEvent>) {
  const row: EventUpdate = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.course !== undefined) row.course = patch.course;
  if (patch.day !== undefined) row.day = patch.day;
  if (patch.start !== undefined) row.start_hour = patch.start;
  if (patch.end !== undefined) row.end_hour = patch.end;
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.rationale !== undefined) row.rationale = patch.rationale;
  if (patch.notes !== undefined) row.notes = patch.notes ?? "";
  if (patch.source !== undefined) row.source = patch.source ?? "manual";
  return row;
}

/* ---------------- shared helpers ---------------- */

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function reportWriteError(what: string, message: string) {
  console.error(`[tempo] failed to save ${what}:`, message);
  toast.error(`Couldn't save ${what}`, { description: message });
}

/** Bumps whenever an integration sync imports new rows. */
function useSyncVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const onSync = () => setVersion((v) => v + 1);
    window.addEventListener("tempo:data-synced", onSync);
    return () => window.removeEventListener("tempo:data-synced", onSync);
  }, []);
  return version;
}

function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (active) setUserId(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (active) setUserId(data.session?.user?.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return userId;
}

/* ---------------- public hooks ---------------- */

export function useTasks() {
  const userId = useUserId();
  const syncVersion = useSyncVersion();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const idRef = useRef<string | null>(null);
  idRef.current = userId;
  // Mirror of the latest state so writes can roll back without a stale closure.
  const tasksRef = useRef<Task[]>([]);
  tasksRef.current = tasks;

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("tasks")
        .select(TASK_COLUMNS)
        .order("created_at", { ascending: true });
      if (!active) return;
      if (data && data.length) {
        setTasks((data as TaskRow[]).map(rowToTask));
      } else {
        // First visit: seed the account with the starter set so the UI isn't empty.
        const seeded = seedTasks.map((t) => ({ ...t, id: newId() }));
        await supabase.from("tasks").insert(seeded.map((t) => taskToRow(t, userId)));
        if (active) setTasks(seeded);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId, syncVersion]);

  const addTask = useCallback((task: Omit<Task, "id">) => {
    const next: Task = { ...task, id: newId() };
    const previous = tasksRef.current;
    setTasks([...previous, next]);
    const uid = idRef.current;
    if (uid) {
      void (async () => {
        const { error } = await supabase.from("tasks").insert(taskToRow(next, uid));
        if (error) {
          setTasks(previous);
          reportWriteError("this task", error.message);
        }
      })();
    }
    return next;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    const previous = tasksRef.current;
    setTasks(previous.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const uid = idRef.current;
    if (!uid) return;
    void (async () => {
      const { error } = await supabase.from("tasks").update(taskPatchToRow(patch)).eq("id", id);
      if (error) {
        setTasks(previous);
        reportWriteError("this task", error.message);
      }
    })();
  }, []);

  const removeTask = useCallback((id: string) => {
    const previous = tasksRef.current;
    setTasks(previous.filter((t) => t.id !== id));
    if (!idRef.current) return;
    void (async () => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) {
        setTasks(previous);
        reportWriteError("this deletion", error.message);
      }
    })();
  }, []);

  return { tasks, loading, addTask, updateTask, removeTask };
}

export function useCalendarEvents() {
  const userId = useUserId();
  const syncVersion = useSyncVersion();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const idRef = useRef<string | null>(null);
  idRef.current = userId;
  const eventsRef = useRef<CalendarEvent[]>([]);
  eventsRef.current = events;

  useEffect(() => {
    if (!userId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("calendar_events")
        .select(EVENT_COLUMNS)
        .order("created_at", { ascending: true });
      if (!active) return;
      if (data && data.length) {
        setEvents((data as EventRow[]).map(rowToEvent));
      } else {
        const seeded = seedEvents.map((e) => ({ ...e, id: newId() }));
        await supabase.from("calendar_events").insert(seeded.map((e) => eventToRow(e, userId)));
        if (active) setEvents(seeded);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId, syncVersion]);

  const addEvent = useCallback((event: Omit<CalendarEvent, "id">) => {
    const next: CalendarEvent = { ...event, id: newId() };
    const previous = eventsRef.current;
    setEvents([...previous, next]);
    const uid = idRef.current;
    if (uid) {
      void (async () => {
        const { error } = await supabase.from("calendar_events").insert(eventToRow(next, uid));
        if (error) {
          setEvents(previous);
          reportWriteError("this event", error.message);
        }
      })();
    }
    return next;
  }, []);

  const updateEvent = useCallback((id: string, patch: Partial<CalendarEvent>) => {
    const previous = eventsRef.current;
    setEvents(previous.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    const uid = idRef.current;
    if (!uid) return;
    void (async () => {
      const { error } = await supabase
        .from("calendar_events")
        .update(eventPatchToRow(patch))
        .eq("id", id);
      if (error) {
        setEvents(previous);
        reportWriteError("this event", error.message);
      }
    })();
  }, []);

  const setKindMany = useCallback((ids: string[], kind: CalendarEvent["kind"]) => {
    if (!ids.length) return;
    const previous = eventsRef.current;
    setEvents(previous.map((e) => (ids.includes(e.id) ? { ...e, kind } : e)));
    if (!idRef.current) return;
    void (async () => {
      const { error } = await supabase.from("calendar_events").update({ kind }).in("id", ids);
      if (error) {
        setEvents(previous);
        reportWriteError("these events", error.message);
      }
    })();
  }, []);

  const removeEvent = useCallback((id: string) => {
    const previous = eventsRef.current;
    setEvents(previous.filter((e) => e.id !== id));
    if (!idRef.current) return;
    void (async () => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) {
        setEvents(previous);
        reportWriteError("this deletion", error.message);
      }
    })();
  }, []);

  return { events, loading, addEvent, updateEvent, setKindMany, removeEvent };
}
