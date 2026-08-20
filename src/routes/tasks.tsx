import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, Search, Sparkles, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { courses, tasks as seedTasks, type Task } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks & deadlines — StudyFlow" },
      {
        name: "description",
        content:
          "Every assignment, reading, and personal to-do in one list, grouped by urgency with AI-suggested study blocks you can approve or adjust.",
      },
      { property: "og:title", content: "Tasks & deadlines — StudyFlow" },
      {
        property: "og:description",
        content: "All your Canvas assignments and personal tasks in one prioritised list.",
      },
    ],
  }),
  component: TasksPage,
});

const buckets = [
  { key: "today", label: "Today & tomorrow" },
  { key: "week", label: "This week" },
  { key: "later", label: "Later" },
] as const;

function TasksPage() {
  const [items, setItems] = useState<Task[]>(seedTasks);
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Task | null>(null);

  const filtered = useMemo(
    () =>
      items.filter(
        (t) =>
          (courseFilter === "all" || t.course === courseFilter) &&
          (statusFilter === "all" || t.status === statusFilter) &&
          t.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, query, courseFilter, statusFilter],
  );

  function toggleDone(id: string) {
    setItems((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: t.status === "done" ? "todo" : "done" } : t)),
    );
  }

  return (
    <AppShell
      title="Tasks"
      subtitle={`${filtered.length} open across ${new Set(filtered.map((t) => t.course)).size} courses`}
      action={<AddTaskSheet />}
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks"
            className="rounded-full pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="flex-1 rounded-full">
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {Object.entries(courses).map(([id, c]) => (
                <SelectItem key={id} value={id}>
                  {c.short}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 rounded-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              <SelectItem value="todo">Not started</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in-progress">In progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-7 space-y-8">
        {buckets.map((b) => {
          const rows = filtered.filter((t) => t.bucket === b.key);
          if (!rows.length) return null;
          return (
            <section key={b.key}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {b.label}
              </h2>
              <ul className="space-y-2">
                {rows.map((t) => (
                  <li key={t.id}>
                    <div
                      className={cn(
                        "flex items-start gap-3 rounded-3xl bg-card p-4 shadow-soft transition-shadow hover:shadow-lifted",
                        t.status === "done" && "opacity-60",
                      )}
                    >
                      <Checkbox
                        checked={t.status === "done"}
                        onCheckedChange={() => toggleDone(t.id)}
                        className="mt-1 rounded-full"
                        aria-label={`Mark ${t.title} done`}
                      />
                      <button
                        onClick={() => setSelected(t)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p
                          className={cn(
                            "truncate font-medium",
                            t.status === "done" && "line-through",
                          )}
                        >
                          {t.title}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                          <span
                            className="rounded-full px-2 py-0.5 font-medium"
                            style={{
                              backgroundColor: courses[t.course].color,
                              color: courses[t.course].ink,
                            }}
                          >
                            {courses[t.course].short}
                          </span>
                          <span className="rounded-full bg-surface px-2 py-0.5 text-muted-foreground">
                            {t.dueLabel}
                          </span>
                          <span className="rounded-full bg-surface px-2 py-0.5 text-muted-foreground">
                            ~{t.effortHours}h
                          </span>
                          {t.suggestions.length ? (
                            <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">
                              <Sparkles className="size-3" />
                              {t.suggestions.length} suggested
                            </span>
                          ) : null}
                        </div>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {!filtered.length ? (
          <p className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-soft">
            Nothing matches those filters.
          </p>
        ) : null}
      </div>

      <TaskDetail task={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </AppShell>
  );
}

function TaskDetail({
  task,
  onOpenChange,
}: {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={!!task} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        {task ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg leading-snug">{task.title}</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 p-4 pt-0">
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span
                  className="rounded-full px-2.5 py-1 font-medium"
                  style={{
                    backgroundColor: courses[task.course].color,
                    color: courses[task.course].ink,
                  }}
                >
                  {courses[task.course].short}
                </span>
                <span className="rounded-full bg-surface px-2.5 py-1 text-muted-foreground">
                  {task.dueLabel}
                </span>
                <span className="rounded-full bg-surface px-2.5 py-1 text-muted-foreground">
                  {task.source === "canvas" ? "From Canvas" : "Added by you"}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">{task.description}</p>

              {task.subtasks.length ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Subtasks</h3>
                  <ul className="space-y-2">
                    {task.subtasks.map((s) => (
                      <li key={s.id} className="flex items-center gap-2.5 text-sm">
                        <Checkbox defaultChecked={s.done} className="rounded-full" />
                        <span className={cn(s.done && "text-muted-foreground line-through")}>
                          {s.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {task.suggestions.length ? (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                    <Sparkles className="size-3.5 text-primary" /> Suggested study blocks
                  </h3>
                  <div className="space-y-2">
                    {task.suggestions.map((s) => (
                      <div key={s.id} className="rounded-2xl bg-surface p-3.5">
                        <p className="text-sm font-medium">{s.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {s.rationale}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" className="h-8 rounded-full">
                            <Check className="size-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 rounded-full">
                            Adjust
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 rounded-full">
                            <X className="size-3.5" /> Dismiss
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function AddTaskSheet() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="rounded-full">
          <Plus className="size-4" /> Add
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New task</SheetTitle>
        </SheetHeader>
        <form
          className="space-y-4 p-4 pt-0"
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Essay draft, problem set…" className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course">Course</Label>
            <Select>
              <SelectTrigger id="course" className="rounded-xl">
                <SelectValue placeholder="Pick a course" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(courses).map(([id, c]) => (
                  <SelectItem key={id} value={id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="due">Due</Label>
              <Input id="due" type="date" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effort">Effort (hrs)</Label>
              <Input id="effort" type="number" min={0.25} step={0.25} className="rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={4} className="rounded-xl" placeholder="Anything the planner should know" />
          </div>
          <Button type="submit" className="w-full rounded-full">
            Add task & schedule it
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
