import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Move,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/use-auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  courses,
  formatHour,
  weekDays,
  type CalendarEvent,
  type CourseId,
} from "@/lib/mock-data";
import { useCalendarEvents } from "@/lib/data-store";
import {
  addDays,
  dateKeyForDay,
  formatWeekRange,
  hoursFromDate,
  startOfWeek,
  toDateKey,
  weekDates,
  weekLabel,
} from "@/lib/dates";
import { useIntegrations } from "@/lib/integrations-store";
import { cn } from "@/lib/utils";



export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Weekly schedule — Tempo" },
      {
        name: "description",
        content:
          "See classes, commitments, and AI-generated study blocks in one week view, with the reasoning behind every scheduled block.",
      },
      { property: "og:title", content: "Weekly schedule — Tempo" },
      {
        property: "og:description",
        content: "Your classes, work, and AI-planned study blocks in a single adaptive calendar.",
      },
    ],
  }),
  component: CalendarPage,
});

const DAY_START = 8;
const DAY_END = 22;
const HOUR_PX = 56;

function CalendarPage() {
  const { signedIn } = useAuth();
  const { events, addEvent, updateEvent, setKindMany, removeEvent } = useCalendarEvents();
  const { google, canvas, googleSync, canvasSync } = useIntegrations();
  const syncing = googleSync.isPending || canvasSync.isPending;

  function syncConnected() {
    if (google?.connected) googleSync.mutate();
    if (canvas?.connected) canvasSync.mutate();
  }

  // Refresh imported events when the page opens and the last sync is stale.
  const autoSynced = useRef(false);
  useEffect(() => {
    if (autoSynced.current || !google?.connected) return;
    const last = google.lastSyncedAt ? new Date(google.lastSyncedAt).getTime() : 0;
    if (Date.now() - last < 15 * 60 * 1000) return;
    autoSynced.current = true;
    googleSync.mutate();
  }, [google?.connected, google?.lastSyncedAt, googleSync]);
  const [view, setView] = useState<"week" | "day">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const todayKey = toDateKey(now);
  const currentWeekStart = startOfWeek(now);
  const weekStart = addDays(currentWeekStart, weekOffset * 7);
  const days = weekDates(weekStart);
  const dayKeys = days.map(toDateKey);
  const todayIndexInWeek = dayKeys.indexOf(todayKey);
  const [activeDay, setActiveDay] = useState(() => (new Date().getDay() + 6) % 7);
  const [modify, setModify] = useState(false);

  const visibleDays = view === "week" ? weekDays.map((_, i) => i) : [activeDay];
  const weekEvents = events.filter((e) =>
    dayKeys.includes(e.date ?? dateKeyForDay(e.day)),
  );
  const suggestedCount = weekEvents.filter((e) => e.kind === "suggested").length;

  function approve(id: string) {
    updateEvent(id, { kind: "study" });
  }
  function approveAll() {
    setKindMany(
      weekEvents.filter((e) => e.kind === "suggested").map((e) => e.id),
      "study",
    );
  }
  function remove(id: string) {
    removeEvent(id);
  }
  function update(id: string, next: Partial<CalendarEvent>) {
    updateEvent(id, next);
  }


  return (
    <AppShell
      title="Calendar"
      subtitle={`${formatWeekRange(weekStart)} · ${suggestedCount} suggestion${suggestedCount === 1 ? "" : "s"} pending`}
      action={
        signedIn ? (
        <div className="flex items-center gap-2">
          <AddEventDialog onCreate={addEvent} dayKeys={dayKeys} />
          {google?.connected || canvas?.connected ? (
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full"
              disabled={syncing}
              onClick={syncConnected}
            >
              <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
              {syncing ? "Syncing" : "Sync"}
            </Button>
          ) : null}
        </div>
        ) : null
      }
    >
      <RequireAuth>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-card p-1 shadow-soft">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-2 text-sm font-medium"
            title="Jump to this week"
          >
            {weekLabel(weekOffset)}
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="flex rounded-full bg-card p-1 shadow-soft">
          {(["week", "day"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant={modify ? "default" : "secondary"}
          className="rounded-full"
          onClick={() => setModify((m) => !m)}
        >
          <Move className="size-3.5" /> {modify ? "Done" : "Modify"}
        </Button>
        {suggestedCount > 0 ? (
          <Button size="sm" variant="secondary" className="rounded-full" onClick={approveAll}>
            <CheckCheck className="size-3.5" /> Approve all
          </Button>
        ) : null}
      </div>

      {modify ? (
        <p className="mb-3 rounded-xl bg-surface px-3 py-2 text-xs text-muted-foreground">
          Drag any block to a new time slot. Tap “Done” when the schedule looks right.
        </p>
      ) : null}


      {view === "day" ? (
        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
          {weekDays.map((d, i) => (
            <button
              key={d}
              onClick={() => setActiveDay(i)}
              className={cn(
                "min-w-14 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                activeDay === i
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground shadow-soft",
              )}
            >
              {d} {days[i]?.getDate()}
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-3xl bg-card p-3 shadow-soft">
        <div style={{ minWidth: view === "week" ? 720 : undefined }}>
          {/* header row */}
          <div
            className="grid gap-1 pb-2"
            style={{ gridTemplateColumns: `48px repeat(${visibleDays.length}, minmax(0,1fr))` }}
          >
            <div />
            {visibleDays.map((d) => (
              <div key={d} className="text-center">
                <p
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    d === todayIndexInWeek ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {weekDays[d]}
                </p>
                <p
                  className={cn(
                    "text-sm font-medium",
                    d === todayIndexInWeek &&
                      "mx-auto flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground",
                  )}
                >
                  {days[d]?.getDate()}
                </p>
              </div>
            ))}
          </div>

          {/* grid */}
          <div
            className="relative grid gap-1"
            style={{ gridTemplateColumns: `48px repeat(${visibleDays.length}, minmax(0,1fr))` }}
          >
            <div className="relative" style={{ height: (DAY_END - DAY_START) * HOUR_PX }}>
              {Array.from({ length: DAY_END - DAY_START }, (_, i) => (
                <span
                  key={i}
                  className="absolute -translate-y-1/2 text-[10px] text-muted-foreground"
                  style={{ top: i * HOUR_PX }}
                >
                  {formatHour(DAY_START + i)}
                </span>
              ))}
            </div>

            {visibleDays.map((d) => (
              <div
                key={d}
                className="relative rounded-xl bg-surface/60"
                style={{ height: (DAY_END - DAY_START) * HOUR_PX }}
              >
                {Array.from({ length: DAY_END - DAY_START }, (_, i) => (
                  <div
                    key={i}
                    className="absolute inset-x-0 border-t border-border/60"
                    style={{ top: i * HOUR_PX }}
                  />
                ))}

                {d === todayIndexInWeek &&
                hoursFromDate(now) >= DAY_START &&
                hoursFromDate(now) <= DAY_END ? (
                  <div
                    className="absolute inset-x-0 z-10 border-t-2 border-primary"
                    style={{ top: (hoursFromDate(now) - DAY_START) * HOUR_PX }}
                  >
                    <span className="absolute -left-0.5 -top-1 size-2 rounded-full bg-primary" />
                  </div>
                ) : null}

                {weekEvents
                  .filter((e) => (e.date ?? dateKeyForDay(e.day)) === dayKeys[d])
                  .map((e) => (
                    <EventBubble
                      key={e.id}
                      event={e}
                      modify={modify}
                      dayOptions={visibleDays}
                      dayKeys={dayKeys}
                      onApprove={() => approve(e.id)}
                      onDelete={() => remove(e.id)}
                      onUpdate={(next) => update(e.id, next)}
                    />
                  ))}

              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-primary/80" /> Class or commitment
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border-2 border-dashed border-primary" /> AI suggestion
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="size-3" /> Tap a block for the reasoning
        </span>
      </div>
      </RequireAuth>
    </AppShell>
  );
}

function AddEventDialog({
  onCreate,
  dayKeys,
}: {
  onCreate: (event: Omit<CalendarEvent, "id">) => CalendarEvent;
  dayKeys: string[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState<CourseId>("life");
  const [day, setDay] = useState(() => (new Date().getDay() + 6) % 7);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [notes, setNotes] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const s = fromTimeValue(start);
    const en = Math.max(fromTimeValue(end), s + 0.25);
    onCreate({
      title: title.trim() || "New event",
      course,
      day,
      date: dayKeys[day],
      start: s,
      end: en,
      kind: "fixed",
      rationale: "You added this event manually.",
      notes,
    });
    setOpen(false);
    setTitle("");
    setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full">
          <Plus className="size-3.5" /> Add event
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add an event</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Study group, shift, appointment…"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Course</Label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(courses) as CourseId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCourse(id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    course === id
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface text-muted-foreground hover:bg-accent",
                  )}
                >
                  {courses[id].short}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Day</Label>
            <div className="flex flex-wrap gap-1.5">
              {weekDays.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDay(i)}
                  className={cn(
                    "size-9 rounded-xl text-xs font-medium transition-colors",
                    day === i
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface text-muted-foreground hover:bg-accent",
                  )}
                >
                  {d[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="event-start">Start</Label>
              <Input
                id="event-start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="h-10 w-32 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-end">End</Label>
              <Input
                id="event-end"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="h-10 w-32 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-notes">Notes</Label>
            <Textarea
              id="event-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className="rounded-xl"
            />
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full rounded-full">
              Add to calendar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toTimeValue(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function fromTimeValue(v: string) {
  const [hh, mm] = v.split(":").map(Number);
  return (hh || 0) + (mm || 0) / 60;
}

function EventBubble({
  event,
  modify,
  dayOptions,
  dayKeys,
  onApprove,
  onDelete,
  onUpdate,
}: {
  event: CalendarEvent;
  modify: boolean;
  dayOptions: number[];
  dayKeys: string[];
  onApprove: () => void;
  onDelete: () => void;
  onUpdate: (next: Partial<CalendarEvent>) => void;
}) {
  const c = courses[event.course];
  const suggested = event.kind === "suggested";
  const imported = event.source === "google";
  const top = (event.start - DAY_START) * HOUR_PX;
  const height = Math.max((event.end - event.start) * HOUR_PX - 4, 26);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);

  function onPointerDown(e: React.PointerEvent) {
    if (!modify || imported) return;
    e.preventDefault();
    drag.current = { x: e.clientX, y: e.clientY };
    setOffset({ x: 0, y: 0 });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = null;
    setOffset(null);

    const colWidth = (ref.current?.parentElement?.offsetWidth ?? 100) + 4;
    const duration = event.end - event.start;
    const snapped = Math.round((dy / HOUR_PX) * 4) / 4;
    const minDay = Math.min(...dayOptions);
    const maxDay = Math.max(...dayOptions);
    const nextDay =
      dayOptions.length > 1
        ? Math.min(maxDay, Math.max(minDay, event.day + Math.round(dx / colWidth)))
        : event.day;
    const nextStart = Math.min(
      DAY_END - duration,
      Math.max(DAY_START, Math.round((event.start + snapped) * 4) / 4),
    );
    onUpdate({
      day: nextDay,
      date: dayKeys[nextDay] ?? event.date,
      start: nextStart,
      end: nextStart + duration,
    });
  }

  const bubble = (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "absolute inset-x-1 z-20 overflow-hidden rounded-[10px] px-2 py-1 text-left transition-transform hover:scale-[1.01] active:scale-100",
        suggested && "border-2 border-dashed",
        modify && !imported && "cursor-grab touch-none shadow-soft",
        modify && !imported && !offset && "jiggling",
        offset && "z-30 cursor-grabbing opacity-90",
      )}
      style={{
        top,
        height,
        backgroundColor: suggested ? `color-mix(in oklab, ${c.color} 45%, transparent)` : c.color,
        borderColor: suggested ? c.ink : undefined,
        color: c.ink,
        transform: offset ? `translate(${offset.x}px, ${offset.y}px)` : undefined,
      }}
    >
      <span className="flex items-start gap-1">
        {suggested ? <Sparkles className="mt-0.5 size-3 shrink-0" /> : null}
        <span className="line-clamp-2 break-words text-[11px] font-semibold leading-tight">
          {event.title}
        </span>
      </span>
      {imported ? (
        <span className="mt-0.5 block text-[10px] font-medium opacity-70">Google</span>
      ) : null}
      {height > 52 ? (
        <span className="mt-0.5 block text-[10px] opacity-80">
          {formatHour(event.start)} – {formatHour(event.end)}
        </span>
      ) : null}
    </div>
  );

  if (modify) return bubble;

  return (
    <Popover onOpenChange={(o) => !o && setEditing(false)}>
      <PopoverTrigger asChild>{bubble}</PopoverTrigger>
      <PopoverContent className="w-72 rounded-2xl">
        <p className="font-semibold leading-snug">{event.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {c.short} · {formatHour(event.start)} – {formatHour(event.end)}
        </p>

        {editing ? (
          <div className="mt-3 space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold">Title</p>
              <Input
                aria-label="Event title"
                className="h-9 rounded-xl"
                value={event.title}
                onChange={(ev) => onUpdate({ title: ev.target.value })}
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold">Day</p>
              <div className="flex flex-wrap gap-1">
                {weekDays.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onUpdate({ day: i, date: dayKeys[i] ?? event.date })}
                    className={cn(
                      "size-8 rounded-lg text-xs font-medium transition-colors",
                      event.day === i
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {d[0]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold">Time</p>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  aria-label="Start time"
                  className="h-9 w-28 rounded-xl"
                  value={toTimeValue(event.start)}
                  onChange={(ev) => {
                    const start = fromTimeValue(ev.target.value);
                    onUpdate({ start, end: Math.max(event.end, start + 0.25) });
                  }}
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="time"
                  aria-label="End time"
                  className="h-9 w-28 rounded-xl"
                  value={toTimeValue(event.end)}
                  onChange={(ev) => {
                    const end = fromTimeValue(ev.target.value);
                    onUpdate({ end: Math.max(end, event.start + 0.25) });
                  }}
                />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold">Notes</p>
              <Textarea
                aria-label="Notes"
                rows={3}
                placeholder="Anything to remember for this block"
                className="rounded-xl text-sm"
                value={event.notes ?? ""}
                onChange={(ev) => onUpdate({ notes: ev.target.value })}
              />
            </div>
            <Button size="sm" className="h-8 w-full rounded-full" onClick={() => setEditing(false)}>
              <Check className="size-3.5" /> Done
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-3 rounded-xl bg-surface p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <Sparkles className="size-3 text-primary" /> Why here
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {event.rationale}
              </p>
            </div>
            {event.notes ? (
              <div className="mt-2 rounded-xl bg-surface p-3">
                <p className="text-xs font-semibold">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                  {event.notes}
                </p>
              </div>
            ) : null}
            {imported ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Synced from Google Calendar. Edit it in Google and sync again.
              </p>
            ) : null}
            <div className={cn("mt-3 flex flex-wrap gap-2", imported && "hidden")}>
              {suggested ? (
                <Button size="sm" className="h-8 rounded-full" onClick={onApprove}>
                  <Check className="size-3.5" /> Approve
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-full"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" /> Edit
              </Button>
              <Button size="sm" variant="ghost" className="h-8 rounded-full" onClick={onDelete}>
                <Trash2 className="size-3.5" /> Delete
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );

}
