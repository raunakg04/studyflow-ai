import { useCallback, useEffect, useRef, useState } from "react";
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
};

const EVENT_COLUMNS = "id, title, course, day, start_hour, end_hour, kind, rationale, notes";

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
  };
}

/* ---------------- shared helpers ---------------- */

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const idRef = useRef<string | null>(null);
  idRef.current = userId;

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
  }, [userId]);

  const addTask = useCallback((task: Omit<Task, "id">) => {
    const next: Task = { ...task, id: newId() };
    setTasks((prev) => [...prev, next]);
    const uid = idRef.current;
    if (uid) void supabase.from("tasks").insert(taskToRow(next, uid));
    return next;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
      const uid = idRef.current;
      const row = next.find((t) => t.id === id);
      if (uid && row) void supabase.from("tasks").update(taskToRow(row, uid)).eq("id", id);
      return next;
    });
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (idRef.current) void supabase.from("tasks").delete().eq("id", id);
  }, []);

  return { tasks, loading, addTask, updateTask, removeTask };
}

export function useCalendarEvents() {
  const userId = useUserId();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const idRef = useRef<string | null>(null);
  idRef.current = userId;

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
  }, [userId]);

  const addEvent = useCallback((event: Omit<CalendarEvent, "id">) => {
    const next: CalendarEvent = { ...event, id: newId() };
    setEvents((prev) => [...prev, next]);
    const uid = idRef.current;
    if (uid) void supabase.from("calendar_events").insert(eventToRow(next, uid));
    return next;
  }, []);

  const updateEvent = useCallback((id: string, patch: Partial<CalendarEvent>) => {
    setEvents((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
      const uid = idRef.current;
      const row = next.find((e) => e.id === id);
      if (uid && row) {
        void supabase.from("calendar_events").update(eventToRow(row, uid)).eq("id", id);
      }
      return next;
    });
  }, []);

  const setKindMany = useCallback((ids: string[], kind: CalendarEvent["kind"]) => {
    setEvents((prev) => prev.map((e) => (ids.includes(e.id) ? { ...e, kind } : e)));
    if (idRef.current && ids.length) {
      void supabase.from("calendar_events").update({ kind }).in("id", ids);
    }
  }, []);


  const removeEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (idRef.current) void supabase.from("calendar_events").delete().eq("id", id);
  }, []);

  return { events, loading, addEvent, updateEvent, setKindMany, removeEvent };
}
