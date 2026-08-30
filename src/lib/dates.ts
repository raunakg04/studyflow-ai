/** Week/date helpers. Weeks start on Monday (day index 0 = Monday). */

export function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(d: Date, n: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

/** Monday of the week containing `d`. */
export function startOfWeek(d: Date = new Date()) {
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const shift = (base.getDay() + 6) % 7; // Sunday(0) -> 6
  return addDays(base, -shift);
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}

export function weekDates(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** Date key for `dayIndex` in the week containing `reference`. */
export function dateKeyForDay(dayIndex: number, reference: Date = new Date()) {
  return toDateKey(addDays(startOfWeek(reference), dayIndex));
}

/** Combine a YYYY-MM-DD key with a decimal hour into a local Date. */
export function dateAtHour(dateKey: string, hour: number) {
  const d = fromDateKey(dateKey);
  const h = Math.floor(hour);
  d.setHours(h, Math.round((hour - h) * 60), 0, 0);
  return d;
}

export function hoursFromDate(d: Date) {
  return d.getHours() + d.getMinutes() / 60;
}

export function formatWeekRange(weekStart: Date) {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const m = (d: Date) => d.toLocaleDateString(undefined, { month: "short" });
  return sameMonth
    ? `${m(weekStart)} ${weekStart.getDate()} – ${end.getDate()}`
    : `${m(weekStart)} ${weekStart.getDate()} – ${m(end)} ${end.getDate()}`;
}

export function weekLabel(offset: number) {
  if (offset === 0) return "This week";
  if (offset === -1) return "Last week";
  if (offset === 1) return "Next week";
  return offset < 0 ? `${Math.abs(offset)} weeks ago` : `In ${offset} weeks`;
}
