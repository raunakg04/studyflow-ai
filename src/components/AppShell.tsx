import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, ListChecks, Settings, Sparkles, Sun } from "lucide-react";
import { AssistantPanel } from "./AssistantPanel";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Today", icon: Sun },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-sidebar px-4 py-6 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold">StudyFlow</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setAssistantOpen(true)}
          className="mt-auto flex items-center gap-3 rounded-2xl bg-primary px-3 py-3 text-sm font-medium text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
        >
          <Sparkles className="size-4" />
          Ask the planner
        </button>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold sm:text-2xl">{title}</h1>
              {subtitle ? (
                <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            {action}
            <button
              onClick={() => setAssistantOpen(true)}
              aria-label="Open planner assistant"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft md:hidden"
            >
              <Sparkles className="size-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-5 pb-28 pt-5 md:pb-12">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:hidden">
        <div className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-accent",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <AssistantPanel open={assistantOpen} onOpenChange={setAssistantOpen} />
    </div>
  );
}
