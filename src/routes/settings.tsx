import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Check, LogOut, Moon, Plug, Sun } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useTheme } from "@/lib/use-theme";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { AvailabilityEditor } from "@/components/AvailabilityEditor";
import { ConnectionsPanel } from "@/components/ConnectionsPanel";
import { useProfile } from "@/lib/profile-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Preferences — Tempo" },
      {
        name: "description",
        content:
          "Adjust your study rhythm, availability, focus block length, and connected accounts so Tempo schedules around your real life.",
      },
      { property: "og:title", content: "Preferences — Tempo" },
      {
        property: "og:description",
        content: "Tune the routines and connections Tempo uses to build your schedule.",
      },
    ],
  }),
  component: SettingsPage,
});

const GOOGLE_RETURN_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "Google Calendar connected and synced." },
  cancelled: { ok: false, text: "The Google connection was cancelled." },
  expired: { ok: false, text: "That connection link expired — try again." },
  no_refresh_token: {
    ok: false,
    text: "Google didn't return offline access. Remove Tempo in your Google account settings, then reconnect.",
  },
  error: { ok: false, text: "Couldn't finish connecting Google Calendar." },
};

/** Shows the outcome of the server-side Google OAuth redirect and refreshes status. */
function useGoogleReturnNotice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("google");
    if (!status) return;
    const message = GOOGLE_RETURN_MESSAGES[status] ?? GOOGLE_RETURN_MESSAGES["error"]!;
    if (message.ok) {
      toast.success(message.text);
      void queryClient.invalidateQueries();
      window.dispatchEvent(new CustomEvent("tempo:data-synced"));
    } else {
      toast.error(message.text);
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
    }
    void navigate({ to: "/settings", replace: true });
  }, [navigate, queryClient]);
}


function SettingsPage() {
  const { profile, update } = useProfile();
  useGoogleReturnNotice();



  return (
    <AppShell title="Preferences" subtitle="The assistant plans around everything here">
      <RequireAuth>
      <div className="space-y-4">
        <AppearanceSection />

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
          <div className="mt-4">
            <AvailabilityEditor
              rules={profile.availability}
              onChange={(availability) => update({ availability })}
            />
          </div>
        </section>

        <section className="rounded-3xl bg-card p-5 shadow-soft">
          <h2 className="text-base font-semibold">Connections</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tempo reads your Google Calendar events and Canvas assignments so it can plan around
            them.
          </p>
          <ConnectionsPanel className="mt-4" />
        </section>

        <AccountSection />
      </div>
      </RequireAuth>
    </AppShell>
  );
}

function AppearanceSection() {
  const { theme, setTheme, hydrated } = useTheme();
  const dark = theme === "dark";

  return (
    <section className="rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-base font-semibold">Appearance</h2>
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface p-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-card">
          {dark ? <Moon className="size-4 text-primary" /> : <Sun className="size-4 text-primary" />}
        </span>
        <div className="min-w-0 flex-1">
          <Label htmlFor="dark-mode" className="font-medium">
            Dark mode
          </Label>
          <p className="text-sm text-muted-foreground">Easier on the eyes for late study sessions.</p>
        </div>
        <Switch
          id="dark-mode"
          checked={dark}
          disabled={!hydrated}
          onCheckedChange={(on) => setTheme(on ? "dark" : "light")}
        />
      </div>
    </section>
  );
}

function AccountSection() {
  const { signedIn, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!signedIn) return null;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <section className="rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="font-display text-lg font-semibold">Account</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Signed in as {user?.email ?? "your account"}.
      </p>
      <Button
        variant="outline"
        className="mt-4 rounded-xl"
        onClick={() => void handleSignOut()}
      >
        <LogOut className="size-4" /> Sign out
      </Button>
    </section>
  );
}
