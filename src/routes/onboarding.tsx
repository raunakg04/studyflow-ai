import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Moon,
  Plug,
  Plus,
  Sparkles,
  Sun,
  Sunset,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { dayKeys, defaultDay, useProfile, type Profile } from "@/lib/profile-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your routine — StudyFlow" },
      {
        name: "description",
        content:
          "Answer a few questions about your rhythm, availability, and commitments so StudyFlow can build a study schedule that actually fits your week.",
      },
      { property: "og:title", content: "Set up your routine — StudyFlow" },
      {
        property: "og:description",
        content: "A two-minute setup so your first schedule is realistic from day one.",
      },
    ],
  }),
  component: Onboarding,
});

const steps = [
  "About you",
  "Your rhythm",
  "Availability",
  "Focus blocks",
  "Commitments",
  "Connections",
  "All set",
];

function Onboarding() {
  const { profile, update } = useProfile();
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const last = step === steps.length - 1;

  function next() {
    if (last) {
      update({ completed: true });
      navigate({ to: "/calendar" });
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-8">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <span className="font-display font-semibold">StudyFlow</span>
          </Link>
          <span className="ml-auto text-sm text-muted-foreground">
            Step {step + 1} of {steps.length}
          </span>
        </div>

        <Progress value={((step + 1) / steps.length) * 100} className="mt-4 h-1.5" />

        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" key={step}>
            <h1 className="text-2xl font-semibold sm:text-3xl">{stepTitles[step]}</h1>
            <p className="mt-2 text-muted-foreground">{stepSubtitles[step]}</p>
            <div className="mt-7">
              <StepBody step={step} profile={profile} update={update} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {step > 0 ? (
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft className="size-4" /> Back
            </Button>
          ) : null}
          <Button className="ml-auto rounded-full px-6" size="lg" onClick={next}>
            {last ? "Generate my schedule" : "Continue"} <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

const stepTitles = [
  "First, the basics",
  "When do you do your best work?",
  "When are you awake?",
  "How long can you focus?",
  "Anything recurring in your week?",
  "Bring in your deadlines",
  "You're all set",
];

const stepSubtitles = [
  "So the assistant knows who it's planning for.",
  "Study blocks get placed in your sharpest hours first.",
  "Nothing gets scheduled outside these hours.",
  "We'll size study blocks to match your attention span.",
  "Work, sports, clubs — these stay protected on your calendar.",
  "Connect Canvas and Google Calendar so nothing gets missed.",
  "Here's what the assistant will use to build your week.",
];

function StepBody({
  step,
  profile,
  update,
}: {
  step: number;
  profile: Profile;
  update: (p: Partial<Profile>) => void;
}) {
  const [commitment, setCommitment] = useState("");

  if (step === 0)
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            value={profile.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Alex Rivera"
            className="h-12 rounded-2xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="school">School</Label>
          <Input
            id="school"
            value={profile.school}
            onChange={(e) => update({ school: e.target.value })}
            placeholder="Northwestern University"
            className="h-12 rounded-2xl"
          />
        </div>
      </div>
    );

  if (step === 1) {
    const options = [
      { key: "morning" as const, icon: Sun, label: "Early bird", desc: "Sharpest before noon" },
      { key: "afternoon" as const, icon: Sunset, label: "Afternoon", desc: "Peak from 1–6 PM" },
      { key: "night" as const, icon: Moon, label: "Night owl", desc: "Focus after dinner" },
    ];
    return (
      <div className="grid gap-3">
        {options.map(({ key, icon: Icon, label, desc }) => (
          <button
            key={key}
            onClick={() => update({ rhythm: key })}
            className={cn(
              "flex items-center gap-4 rounded-3xl border-2 bg-card p-4 text-left shadow-soft transition-colors",
              profile.rhythm === key ? "border-primary" : "border-transparent",
            )}
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-surface">
              <Icon className="size-5 text-primary" />
            </span>
            <span className="flex-1">
              <span className="block font-medium">{label}</span>
              <span className="block text-sm text-muted-foreground">{desc}</span>
            </span>
            {profile.rhythm === key ? <Check className="size-4 text-primary" /> : null}
          </button>
        ))}
      </div>
    );
  }

  if (step === 2)
    return (
      <div className="space-y-3">
        {dayKeys.map((d) => {
          const day = profile.days[d] ?? defaultDay;
          const setDay = (patch: Partial<typeof day>) =>
            update({ days: { ...profile.days, [d]: { ...day, ...patch } } });
          return (
            <div
              key={d}
              className="flex flex-wrap items-center gap-2 rounded-2xl bg-card p-3 shadow-soft"
            >
              <span className="w-9 text-sm font-medium">{d}</span>
              <Input
                type="time"
                aria-label={`${d} wake time`}
                value={day.wake}
                onChange={(e) => setDay({ wake: e.target.value })}
                disabled={day.off}
                className="w-28 rounded-xl"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="time"
                aria-label={`${d} sleep time`}
                value={day.sleep}
                onChange={(e) => setDay({ sleep: e.target.value })}
                disabled={day.off}
                className="w-28 rounded-xl"
              />
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rest day</span>
                <Switch checked={day.off} onCheckedChange={(v) => setDay({ off: v })} />
              </div>
            </div>
          );
        })}
      </div>
    );

  if (step === 3)
    return (
      <div className="space-y-8 rounded-3xl bg-card p-5 shadow-soft">
        <div>
          <div className="flex items-baseline justify-between">
            <Label>Focus block</Label>
            <span className="font-display text-xl font-semibold">{profile.focusMinutes} min</span>
          </div>
          <Slider
            className="mt-4"
            min={25}
            max={120}
            step={5}
            value={[profile.focusMinutes]}
            onValueChange={(v) => update({ focusMinutes: v[0] ?? profile.focusMinutes })}
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <Label>Break between blocks</Label>
            <span className="font-display text-xl font-semibold">{profile.breakMinutes} min</span>
          </div>
          <Slider
            className="mt-4"
            min={5}
            max={30}
            step={5}
            value={[profile.breakMinutes]}
            onValueChange={(v) => update({ breakMinutes: v[0] ?? profile.breakMinutes })}
          />
        </div>
      </div>
    );

  if (step === 4)
    return (
      <div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!commitment.trim()) return;
            update({ commitments: [...profile.commitments, commitment.trim()] });
            setCommitment("");
          }}
        >
          <Input
            value={commitment}
            onChange={(e) => setCommitment(e.target.value)}
            placeholder="Café shift, soccer practice…"
            className="h-12 rounded-2xl"
          />
          <Button type="submit" size="icon" className="size-12 shrink-0 rounded-2xl">
            <Plus className="size-4" />
            <span className="sr-only">Add commitment</span>
          </Button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.commitments.map((c) => (
            <span
              key={c}
              className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm text-accent-foreground"
            >
              {c}
              <button
                onClick={() =>
                  update({ commitments: profile.commitments.filter((x) => x !== c) })
                }
                aria-label={`Remove ${c}`}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          {!profile.commitments.length ? (
            <p className="text-sm text-muted-foreground">
              No commitments yet — add as many as you like.
            </p>
          ) : null}
        </div>
      </div>
    );

  if (step === 5)
    return (
      <div className="space-y-3">
        {[
          {
            key: "google" as const,
            name: "Google Calendar",
            desc: "Pull in classes, work shifts, and events",
          },
          { key: "canvas" as const, name: "Canvas", desc: "Import assignments and due dates" },
        ].map((c) => {
          const connected = profile.connected[c.key];
          return (
            <div key={c.key} className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-surface">
                <Plug className="size-5 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </div>
              <Button
                size="sm"
                variant={connected ? "secondary" : "default"}
                className="rounded-full"
                onClick={() => update({ connected: { ...profile.connected, [c.key]: !connected } })}
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
        <p className="text-center text-xs text-muted-foreground">
          Live syncing is coming soon — for now we'll load a sample semester.
        </p>
      </div>
    );

  const summary = [
    ["Name", profile.name || "—"],
    ["School", profile.school || "—"],
    ["Rhythm", profile.rhythm || "—"],
    ["Focus", `${profile.focusMinutes} min focus / ${profile.breakMinutes} min break`],
    ["Commitments", profile.commitments.join(", ") || "None"],
    [
      "Connected",
      [profile.connected.google && "Google Calendar", profile.connected.canvas && "Canvas"]
        .filter(Boolean)
        .join(", ") || "None yet",
    ],
  ];

  return (
    <div className="rounded-3xl bg-card p-5 shadow-soft">
      <dl className="divide-y divide-border">
        {summary.map(([k, v]) => (
          <div key={k} className="flex gap-4 py-3 text-sm first:pt-0 last:pb-0">
            <dt className="w-28 shrink-0 text-muted-foreground">{k}</dt>
            <dd className="flex-1 font-medium capitalize">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
