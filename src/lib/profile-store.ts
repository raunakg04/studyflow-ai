import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AvailabilityRule = {
  id: string;
  days: string[];
  start: string;
  end: string;
};

export type Profile = {
  name: string;
  school: string;
  rhythm: "morning" | "afternoon" | "evening" | "night" | "";
  availability: AvailabilityRule[];
  focusMinutes: number;
  breakMinutes: number;
  commitments: string[];
  connected: { google: boolean; canvas: boolean };
  completed: boolean;
};

export const dayKeys = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const weekdayKeys = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export function newRule(days: string[] = weekdayKeys): AvailabilityRule {
  return {
    id: Math.random().toString(36).slice(2, 9),
    days,
    start: "08:00",
    end: "22:00",
  };
}

export const emptyProfile: Profile = {
  name: "",
  school: "",
  rhythm: "",
  availability: [
    { id: "weekdays", days: [...weekdayKeys], start: "08:00", end: "22:00" },
    { id: "weekend", days: ["Sat", "Sun"], start: "10:00", end: "20:00" },
  ],
  focusMinutes: 50,
  breakMinutes: 10,
  commitments: [],
  connected: { google: false, canvas: false },
  completed: false,
};

const KEY = "studyflow.profile";

type ProfileRow = {
  name: string;
  school: string;
  rhythm: string;
  availability: unknown;
  focus_minutes: number;
  break_minutes: number;
  commitments: unknown;
  connected: unknown;
  completed: boolean;
};

function rowToProfile(row: ProfileRow): Profile {
  return {
    name: row.name ?? "",
    school: row.school ?? "",
    rhythm: (row.rhythm ?? "") as Profile["rhythm"],
    availability: Array.isArray(row.availability) && row.availability.length
      ? (row.availability as AvailabilityRule[])
      : emptyProfile.availability,
    focusMinutes: row.focus_minutes ?? 50,
    breakMinutes: row.break_minutes ?? 10,
    commitments: Array.isArray(row.commitments) ? (row.commitments as string[]) : [],
    connected: {
      google: Boolean((row.connected as { google?: boolean } | null)?.google),
      canvas: Boolean((row.connected as { canvas?: boolean } | null)?.canvas),
    },
    completed: Boolean(row.completed),
  };
}

function profileToRow(profile: Profile, id: string) {
  return {
    id,
    name: profile.name,
    school: profile.school,
    rhythm: profile.rhythm,
    availability: profile.availability,
    focus_minutes: profile.focusMinutes,
    break_minutes: profile.breakMinutes,
    commitments: profile.commitments,
    connected: profile.connected,
    completed: profile.completed,
  };
}

function readLocal(): Profile | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return {
      ...emptyProfile,
      ...parsed,
      availability: parsed.availability?.length
        ? parsed.availability
        : emptyProfile.availability,
    };
  } catch {
    return null;
  }
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [hydrated, setHydrated] = useState(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const local = readLocal();
    if (local) setProfile(local);

    async function loadRemote(userId: string) {
      const { data } = await supabase
        .from("profiles")
        .select(
          "name, school, rhythm, availability, focus_minutes, break_minutes, commitments, connected, completed",
        )
        .eq("id", userId)
        .maybeSingle();
      if (!active) return;
      if (data) {
        const remote = rowToProfile(data as ProfileRow);
        // A brand-new empty row shouldn't wipe locally captured onboarding answers.
        if (remote.completed || remote.name || remote.rhythm) {
          setProfile(remote);
          try {
            window.localStorage.setItem(KEY, JSON.stringify(remote));
          } catch {
            /* storage unavailable */
          }
        } else if (local) {
          await supabase.from("profiles").upsert(profileToRow(local, userId));
        }
      } else if (local) {
        await supabase.from("profiles").upsert(profileToRow(local, userId));
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      userIdRef.current = userId;
      if (userId) void loadRemote(userId);
    });

    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user?.id ?? null;
      userIdRef.current = userId;
      if (userId) void loadRemote(userId);
      if (active) setHydrated(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const update = useCallback((patch: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      const userId = userIdRef.current;
      if (userId) {
        void supabase.from("profiles").upsert(profileToRow(next, userId));
      }
      return next;
    });
  }, []);

  return { profile, update, hydrated };
}
