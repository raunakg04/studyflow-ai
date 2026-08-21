import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Move,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  courses,
  events as seedEvents,
  formatHour,
  weekDays,
  type CalendarEvent,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Weekly schedule — StudyFlow" },
      {
        name: "description",
        content:
          "See classes, commitments, and AI-generated study blocks in one week view, with the reasoning behind every scheduled block.",
      },
      { property: "og:title", content: "Weekly schedule — StudyFlow" },
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
  const [events, setEvents] = useState<CalendarEvent[]>(seedEvents);
  const [view, setView] = useState<"week" | "day">("week");
  const [activeDay, setActiveDay] = useState(3);

  const visibleDays = view === "week" ? weekDays.map((_, i) => i) : [activeDay];

  function approve(id: string) {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, kind: "study" } : e)));
  }
  function remove(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <AppShell
      title="Calendar"
      subtitle="Aug 17 – 23 · 6 study blocks planned"
      action={
        <Button size="sm" variant="secondary" className="rounded-full">
          <RefreshCw className="size-3.5" /> Re-plan
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-card p-1 shadow-soft">
          <button
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="px-2 text-sm font-medium">This week</span>
          <button
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
      </div>

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
              {d}
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
                    d === 3 ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {weekDays[d]}
                </p>
                <p className="text-sm font-medium">{17 + d}</p>
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

                {d === 3 ? (
                  <div
                    className="absolute inset-x-0 z-10 border-t-2 border-primary"
                    style={{ top: (16.75 - DAY_START) * HOUR_PX }}
                  >
                    <span className="absolute -left-0.5 -top-1 size-2 rounded-full bg-primary" />
                  </div>
                ) : null}

                {events
                  .filter((e) => e.day === d)
                  .map((e) => (
                    <EventBubble
                      key={e.id}
                      event={e}
                      onApprove={() => approve(e.id)}
                      onDelete={() => remove(e.id)}
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
    </AppShell>
  );
}

function EventBubble({
  event,
  onApprove,
  onDelete,
}: {
  event: CalendarEvent;
  onApprove: () => void;
  onDelete: () => void;
}) {
  const c = courses[event.course];
  const suggested = event.kind === "suggested";
  const top = (event.start - DAY_START) * HOUR_PX;
  const height = Math.max((event.end - event.start) * HOUR_PX - 4, 26);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "absolute inset-x-1 z-20 overflow-hidden rounded-[10px] px-2 py-1 text-left transition-transform hover:scale-[1.01] active:scale-100",
            suggested && "border-2 border-dashed",
          )}
          style={{
            top,
            height,
            backgroundColor: suggested ? `color-mix(in oklab, ${c.color} 45%, transparent)` : c.color,
            borderColor: suggested ? c.ink : undefined,
            color: c.ink,
          }}
        >
          <span className="flex items-start gap-1">
            {suggested ? <Sparkles className="mt-0.5 size-3 shrink-0" /> : null}
            <span className="line-clamp-2 break-words text-[11px] font-semibold leading-tight">
              {event.title}
            </span>
          </span>
          {height > 52 ? (
            <span className="mt-0.5 block text-[10px] opacity-80">
              {formatHour(event.start)} – {formatHour(event.end)}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 rounded-2xl">
        <p className="font-semibold leading-snug">{event.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {c.short} · {formatHour(event.start)} – {formatHour(event.end)}
        </p>
        <div className="mt-3 rounded-xl bg-surface p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <Sparkles className="size-3 text-primary" /> Why here
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{event.rationale}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggested ? (
            <Button size="sm" className="h-8 rounded-full" onClick={onApprove}>
              <Check className="size-3.5" /> Approve
            </Button>
          ) : null}
          <Button size="sm" variant="outline" className="h-8 rounded-full">
            Reschedule
          </Button>
          <Button size="sm" variant="ghost" className="h-8 rounded-full" onClick={onDelete}>
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
