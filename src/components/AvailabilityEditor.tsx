import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dayKeys, newRule, type AvailabilityRule } from "@/lib/profile-store";
import { cn } from "@/lib/utils";

export function AvailabilityEditor({
  rules,
  onChange,
}: {
  rules: AvailabilityRule[];
  onChange: (rules: AvailabilityRule[]) => void;
}) {
  function patch(id: string, next: Partial<AvailabilityRule>) {
    onChange(rules.map((r) => (r.id === id ? { ...r, ...next } : r)));
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <div key={rule.id} className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="flex flex-wrap items-center gap-1.5">
            {dayKeys.map((d) => {
              const on = rule.days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    patch(rule.id, {
                      days: on ? rule.days.filter((x) => x !== d) : [...rule.days, d],
                    })
                  }
                  className={cn(
                    "size-9 rounded-xl text-sm font-medium transition-colors",
                    on
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface text-muted-foreground hover:bg-accent",
                  )}
                >
                  {d[0]}
                </button>
              );
            })}
            {rules.length > 1 ? (
              <button
                type="button"
                onClick={() => onChange(rules.filter((r) => r.id !== rule.id))}
                aria-label="Remove time rule"
                className="ml-auto flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Input
              type="time"
              aria-label="Available from"
              value={rule.start}
              onChange={(e) => patch(rule.id, { start: e.target.value })}
              className="w-32 rounded-xl"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="time"
              aria-label="Available until"
              value={rule.end}
              onChange={(e) => patch(rule.id, { end: e.target.value })}
              className="w-32 rounded-xl"
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        className="rounded-full"
        onClick={() => onChange([...rules, newRule(["Sat", "Sun"])])}
      >
        <Plus className="size-4" /> Add time rule
      </Button>
    </div>
  );
}
