import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/profile-store";
import { useAuth } from "@/lib/use-auth";
import { courses, events, formatHour, tasks } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyFlow — AI study planner for students" },
      {
        name: "description",
        content:
          "StudyFlow turns your Canvas deadlines, calendar, and routines into a realistic study schedule that adapts as your week changes.",
      },
      { property: "og:title", content: "StudyFlow — AI study planner for students" },
      {
        property: "og:description",
        content:
          "One place for deadlines, tasks, and time-blocking. StudyFlow builds and adapts your study schedule automatically.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { profile, hydrated } = useProfile();

  if (hydrated && !profile.completed) return <Landing />;

  const today = events.filter((e) => e.day === 3).sort((a, b) => a.start - b.start);
  const dueSoon = tasks.filter((t) => t.bucket === "today");

  return (
    <AppShell
      title={profile.name ? `Hi ${profile.name.split(" ")[0]}` : "Today"}
      subtitle="Thursday, August 20 · 3 focus blocks planned"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Clock} label="Focus time today" value="4h 15m" />
        <StatCard icon={CheckCircle2} label="Tasks due" value={`${dueSoon.length}`} />
        <StatCard icon={Sparkles} label="AI suggestions" value="3 to review" />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Today at a glance</h2>
          <Link to="/calendar" className="text-sm font-medium text-primary">
            Full week
          </Link>
        </div>
        <ul className="space-y-2">
          {today.map((e) => {
            const c = courses[e.course];
            return (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft"
                style={{ borderLeft: `4px solid ${c.color}` }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatHour(e.start)} – {formatHour(e.end)} · {c.short}
                  </p>
                </div>
                {e.kind === "suggested" ? (
                  <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                    <Sparkles className="size-3" /> AI
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Due soon</h2>
          <Link to="/tasks" className="text-sm font-medium text-primary">
            All tasks
          </Link>
        </div>
        <ul className="space-y-2">
          {dueSoon.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: courses[t.course].color }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.title}</p>
                <p className="text-sm text-muted-foreground">{t.dueLabel}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl bg-card p-4 shadow-soft">
      <Icon className="size-4 text-primary" />
      <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function Landing() {
  const { signedIn } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="size-5" />
        </span>
        <h1 className="mt-8 text-4xl font-semibold leading-tight sm:text-5xl">
          Your semester, time-blocked for you.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          StudyFlow pulls in your Canvas deadlines, classes, and routines, then builds a realistic
          study schedule — and quietly rebuilds it whenever your week shifts.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-full px-6">
            <Link to="/onboarding">
              Get started <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-6">
            <Link to="/calendar">See a sample week</Link>
          </Button>
          {!signedIn ? (
            <Button asChild size="lg" variant="ghost" className="rounded-full px-6">
              <Link to="/auth">Sign in</Link>
            </Button>
          ) : null}
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { icon: CalendarDays, title: "One calendar", body: "Classes, work, and study blocks together." },
            { icon: Sparkles, title: "Adaptive plan", body: "Miss a block? The week reshuffles itself." },
            { icon: Clock, title: "No manual blocking", body: "Get hours back every single week." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-3xl bg-card p-5 shadow-soft">
              <Icon className="size-4 text-primary" />
              <p className="mt-3 font-medium">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
