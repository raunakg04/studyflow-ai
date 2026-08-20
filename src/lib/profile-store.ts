import { useCallback, useEffect, useState } from "react";

export type DayAvailability = { wake: string; sleep: string; off: boolean };

export type Profile = {
  name: string;
  school: string;
  rhythm: "morning" | "afternoon" | "night" | "";
  days: Record<string, DayAvailability>;
  focusMinutes: number;
  breakMinutes: number;
  commitments: string[];
  connected: { google: boolean; canvas: boolean };
  completed: boolean;
};

export const dayKeys = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const emptyProfile: Profile = {
  name: "",
  school: "",
  rhythm: "",
  days: Object.fromEntries(
    dayKeys.map((d) => [
      d,
      { wake: d === "Sat" || d === "Sun" ? "09:00" : "07:30", sleep: "23:30", off: false },
    ]),
  ) as Record<string, DayAvailability>,
  focusMinutes: 50,
  breakMinutes: 10,
  commitments: [],
  connected: { google: false, canvas: false },
  completed: false,
};

const KEY = "studyflow.profile";

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setProfile({ ...emptyProfile, ...(JSON.parse(raw) as Profile) });
    } catch {
      /* ignore malformed storage */
    }
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  return { profile, update, hydrated };
}
