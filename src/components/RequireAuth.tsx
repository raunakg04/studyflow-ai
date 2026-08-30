import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";

/**
 * Gates a page behind sign-in. Signed-out visitors see a prompt instead of
 * any schedule or task data.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { signedIn, loading } = useAuth();

  if (loading) {
    return (
      <div className="rounded-3xl bg-card p-8 text-sm text-muted-foreground shadow-soft">
        Loading…
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="rounded-3xl bg-card p-8 text-center shadow-soft">
        <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <Lock className="size-5" />
        </span>
        <h2 className="mt-4 font-display text-xl font-semibold">Sign in to see your plan</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Your tasks, calendar, and preferences are private to your account.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild className="rounded-full px-6">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full px-6">
            <Link to="/">Go to homepage</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
