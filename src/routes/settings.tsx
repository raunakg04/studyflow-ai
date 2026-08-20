import { createFileRoute } from "@tanstack/react-router";
import { Check, Plug } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { dayKeys, defaultDay, useProfile } from "@/lib/profile-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Preferences — StudyFlow" },
      {
        name: "description",
        content:
          "Adjust your study rhythm, availability, focus block length, and connected accounts so StudyFlow schedules around your real life.",
      },
      { property: "og:title", content: "Preferences — StudyFlow" },
      {
        property: "og:description",
        content: "Tune the routines and connections StudyFlow uses to build your schedule.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, update } = useProfile();

  return (
    <AppShell title="Preferences" subtitle="The assistant plans around everything here">
      <div className="space-y-4">
        <section className="rounded-3xl bg-card p-5 shadow-soft">
          <h2 className="text-base font-semibold">About you</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => update({ name: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school">School</Label>
              <Input
                id="school"
                value={profile.school}
                onChange={(e) => update({ school: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-card p-5 shadow-soft">
          <h2 className="text-base font-semibold">Focus rhythm</h2>
          <div className="mt-5 space-y-6">
            <div>
              <div className="flex items-center justify-between text-sm">
                <Label>Focus block length</Label>
                <span className="text-muted-foreground">{profile.focusMinutes} min</span>
              </div>
              <Slider
                className="mt-3"
                min={25}
                max={120}
                step={5}
                value={[profile.focusMinutes]}
                onValueChange={(v) => update({ focusMinutes: v[0] ?? profile.focusMinutes })}
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <Label>Break between blocks</Label>
                <span className="text-muted-foreground">{profile.breakMinutes} min</span>
              </div>
              <Slider
                className="mt-3"
                min={5}
                max={30}
                step={5}
                value={[profile.breakMinutes]}
                onValueChange={(v) => update({ breakMinutes: v[0] ?? profile.breakMinutes })}
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-card p-5 shadow-soft">
          <h2 className="text-base font-semibold">Weekly availability</h2>
          <div className="mt-4 space-y-3">
            {dayKeys.map((d) => {
              const day = profile.days[d] ?? defaultDay;
              const setDay = (patch: Partial<typeof day>) =>
                update({ days: { ...profile.days, [d]: { ...day, ...patch } } });
              return (
                <div key={d} className="flex flex-wrap items-center gap-3">
                  <span className="w-10 text-sm font-medium">{d}</span>
                  <Input
                    type="time"
                    value={day.wake}
                    onChange={(e) =>
                      update({ days: { ...profile.days, [d]: { ...day, wake: e.target.value } } })
                    }
                    className="w-30 rounded-xl"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={day.sleep}
                    onChange={(e) =>
                      update({ days: { ...profile.days, [d]: { ...day, sleep: e.target.value } } })
                    }
                    className="w-30 rounded-xl"
                  />
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Day off</span>
                    <Switch
                      checked={day.off}
                      onCheckedChange={(v) =>
                        update({ days: { ...profile.days, [d]: { ...day, off: v } } })
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl bg-card p-5 shadow-soft">
          <h2 className="text-base font-semibold">Connections</h2>
          <div className="mt-4 space-y-3">
            {[
              { key: "google" as const, name: "Google Calendar", desc: "Classes, work shifts, and events" },
              { key: "canvas" as const, name: "Canvas", desc: "Assignments, quizzes, and due dates" },
            ].map((c) => {
              const connected = profile.connected[c.key];
              return (
                <div key={c.key} className="flex items-center gap-3 rounded-2xl bg-surface p-4">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-card">
                    <Plug className="size-4 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.desc}</p>
                  </div>
                  <Button
                    variant={connected ? "secondary" : "default"}
                    size="sm"
                    className="rounded-full"
                    onClick={() =>
                      update({ connected: { ...profile.connected, [c.key]: !connected } })
                    }
                  >
                    {connected ? (
                      <>
                        <Check className="size-3.5" /> Connected
                      </>
                    ) : (
                      "Connect"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
