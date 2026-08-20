import { useCallback, useEffect, useState } from "react";

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

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Profile>;
        setProfile({
          ...emptyProfile,
          ...parsed,
          availability: parsed.availability?.length
            ? parsed.availability
            : emptyProfile.availability,
        });
      }
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
