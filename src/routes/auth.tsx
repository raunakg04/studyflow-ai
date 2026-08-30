import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/use-auth";
import {
  markPendingSignInRedirect,
  resolveSignInTarget,
} from "@/lib/post-signin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Tempo" },
      {
        name: "description",
        content:
          "Sign in to Tempo with Google to sync your deadlines, tasks, and adaptive study schedule across devices.",
      },
      { property: "og:title", content: "Sign in — Tempo" },
      {
        property: "og:description",
        content: "Access your Tempo planner and keep your study schedule in sync.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

// Lovable's managed OAuth broker only exists on Lovable-hosted surfaces
// (editor preview, published *.lovable.app). Anywhere else — a standalone
// deployment such as Vercel, or local dev of the exported repo — sign in
// through Supabase's native OAuth flow instead. Both paths set the session
// on the same client, so the rest of the app is identical.
const LOVABLE_HOSTS = [
  "lovable.app",
  "lovableproject.com",
  "lovableproject-dev.com",
  "gpt-eng.com",
  "gptengineer.run",
];

function isLovableEnvironment() {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  return LOVABLE_HOSTS.some((zone) => host === zone || host.endsWith(`.${zone}`));
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { signedIn, loading, user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [sentConfirmation, setSentConfirmation] = useState(false);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (loading || !signedIn || !userId) return;
    let active = true;
    void resolveSignInTarget(userId).then((to) => {
      if (active) navigate({ to, replace: true });
    });
    return () => {
      active = false;
    };
  }, [loading, signedIn, userId, navigate]);

  async function handleGoogle() {
    setBusy("google");
    markPendingSignInRedirect();

    if (isLovableEnvironment()) {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setBusy(null);
        toast.error("Google sign-in failed", { description: result.error.message });
        return;
      }
      if (result.redirected) return;
      return;
    }

    // Standalone deployment: native Supabase OAuth. On success the browser
    // navigates away to Google and returns to the origin, where the pending
    // redirect flag routes the user to onboarding or the calendar.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setBusy(null);
      toast.error("Google sign-in failed", { description: error.message });
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setBusy(null);
      if (error) {
        toast.error("Could not create account", { description: error.message });
        return;
      }
      if (!data.session) {
        setSentConfirmation(true);
        return;
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(null);
    if (error) {
      toast.error("Could not sign in", { description: error.message });
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <span className="font-display text-lg font-semibold">Tempo</span>
      </Link>

      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-soft">
        <h1 className="font-display text-2xl font-semibold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sync your deadlines, tasks, and schedule across every device.
        </p>

        {sentConfirmation ? (
          <div className="mt-6 rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground">
            Check your inbox — we sent a confirmation link to {email}. Your planner unlocks once
            you confirm.
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          disabled={busy !== null}
          className="mt-6 h-11 w-full justify-center gap-2 rounded-xl"
        >
          {busy === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleMark />}
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or use email</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 rounded-xl"
            />
          </div>
          <Button type="submit" disabled={busy !== null} className="h-11 w-full rounded-xl">
            {busy === "email" ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New to Tempo?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setSentConfirmation(false);
            }}
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>

      <Link to="/" className="mt-6 text-sm text-muted-foreground hover:text-foreground">
        Keep exploring without an account
      </Link>
    </div>
  );
}
