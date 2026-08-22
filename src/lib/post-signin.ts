import { supabase } from "@/integrations/supabase/client";

const PENDING_KEY = "studyflow.pendingSignInRedirect";

/** Mark that the next SIGNED_IN event should route the user automatically. */
export function markPendingSignInRedirect() {
  try {
    window.sessionStorage.setItem(PENDING_KEY, "1");
  } catch {
    /* storage unavailable */
  }
}

export function consumePendingSignInRedirect(): boolean {
  try {
    const pending = window.sessionStorage.getItem(PENDING_KEY);
    if (pending) window.sessionStorage.removeItem(PENDING_KEY);
    return Boolean(pending);
  } catch {
    return false;
  }
}

/**
 * Recurring students (onboarding completed) land on the calendar,
 * brand-new students go through onboarding.
 */
export async function resolveSignInTarget(userId: string): Promise<"/calendar" | "/onboarding"> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("completed")
      .eq("id", userId)
      .maybeSingle();
    if (data?.completed) return "/calendar";
  } catch {
    /* fall through to local check */
  }

  try {
    const raw = window.localStorage.getItem("studyflow.profile");
    if (raw && (JSON.parse(raw) as { completed?: boolean }).completed) return "/calendar";
  } catch {
    /* storage unavailable */
  }

  return "/onboarding";
}
