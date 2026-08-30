export type CourseId = "cs" | "bio" | "econ" | "hist" | "math" | "life";

export const courses: Record<
  CourseId,
  { name: string; short: string; color: string; ink: string }
> = {
  cs: { name: "CS 250 — Algorithms", short: "CS 250", color: "var(--course-1)", ink: "var(--course-1-ink)" },
  bio: { name: "BIO 110 — Cell Biology", short: "BIO 110", color: "var(--course-4)", ink: "var(--course-4-ink)" },
  econ: { name: "ECON 201 — Microeconomics", short: "ECON 201", color: "var(--course-2)", ink: "var(--course-2-ink)" },
  hist: { name: "HIST 145 — Modern Europe", short: "HIST 145", color: "var(--course-3)", ink: "var(--course-3-ink)" },
  math: { name: "MATH 221 — Linear Algebra", short: "MATH 221", color: "var(--course-5)", ink: "var(--course-5-ink)" },
  life: { name: "Personal", short: "Personal", color: "var(--course-6)", ink: "var(--course-6-ink)" },
};

export type TaskStatus = "todo" | "scheduled" | "in-progress" | "done";

export type Task = {
  id: string;
  title: string;
  course: CourseId;
  due: string; // ISO-ish display date
  dueLabel: string;
  bucket: "today" | "week" | "later";
  effortHours: number;
  status: TaskStatus;
  source: "canvas" | "manual";
  description: string;
  subtasks: { id: string; label: string; done: boolean }[];
  suggestions: { id: string; label: string; rationale: string }[];
};

export const tasks: Task[] = [
  {
    id: "t1",
    title: "Problem Set 4 — Dynamic Programming",
    course: "cs",
    due: "2026-08-20",
    dueLabel: "Due today, 11:59 PM",
    bucket: "today",
    effortHours: 3,
    status: "in-progress",
    source: "canvas",
    description:
      "Six DP problems from chapter 15. Show recurrence relations and complexity analysis for each.",
    subtasks: [
      { id: "s1", label: "Re-read lecture notes on memoization", done: true },
      { id: "s2", label: "Problems 1–3", done: true },
      { id: "s3", label: "Problems 4–6", done: false },
      { id: "s4", label: "Write up complexity analysis", done: false },
    ],
    suggestions: [
      {
        id: "g1",
        label: "Today, 4:00–5:30 PM",
        rationale: "Your last free block before the deadline, and you focus best mid-afternoon.",
      },
      {
        id: "g2",
        label: "Today, 8:00–9:00 PM",
        rationale: "Buffer session in case the write-up runs long.",
      },
    ],
  },
  {
    id: "t2",
    title: "Lab report: enzyme kinetics",
    course: "bio",
    due: "2026-08-21",
    dueLabel: "Due tomorrow, 5:00 PM",
    bucket: "today",
    effortHours: 2.5,
    status: "scheduled",
    source: "canvas",
    description: "Full write-up with graphs from Tuesday's lab data. Rubric posted on Canvas.",
    subtasks: [
      { id: "s1", label: "Plot Michaelis–Menten curve", done: false },
      { id: "s2", label: "Draft discussion section", done: false },
    ],
    suggestions: [
      {
        id: "g1",
        label: "Tomorrow, 9:30–11:00 AM",
        rationale: "You have no classes tomorrow morning and graphs are easier when you're fresh.",
      },
    ],
  },
  {
    id: "t3",
    title: "Read Ch. 7–8 + discussion post",
    course: "hist",
    due: "2026-08-23",
    dueLabel: "Due Sunday",
    bucket: "week",
    effortHours: 2,
    status: "scheduled",
    source: "canvas",
    description: "Two chapters on interwar politics, then a 300-word post responding to a peer.",
    subtasks: [
      { id: "s1", label: "Chapter 7", done: false },
      { id: "s2", label: "Chapter 8", done: false },
      { id: "s3", label: "Draft post", done: false },
    ],
    suggestions: [
      {
        id: "g1",
        label: "Saturday, 10:00–11:00 AM",
        rationale: "Reading splits well across two calm weekend mornings.",
      },
    ],
  },
  {
    id: "t4",
    title: "Midterm 1 study — supply & demand",
    course: "econ",
    due: "2026-08-26",
    dueLabel: "Exam Wednesday",
    bucket: "week",
    effortHours: 6,
    status: "scheduled",
    source: "canvas",
    description: "Chapters 1–5, plus the two practice exams posted in the module.",
    subtasks: [
      { id: "s1", label: "Practice exam A", done: false },
      { id: "s2", label: "Review missed concepts", done: false },
      { id: "s3", label: "Practice exam B", done: false },
    ],
    suggestions: [
      {
        id: "g1",
        label: "Spread over 4 sessions",
        rationale: "Spaced repetition beats cramming — sessions are 90 minutes each, one per day.",
      },
    ],
  },
  {
    id: "t5",
    title: "Linear algebra WebAssign #6",
    course: "math",
    due: "2026-08-28",
    dueLabel: "Due Aug 28",
    bucket: "later",
    effortHours: 1.5,
    status: "todo",
    source: "canvas",
    description: "Eigenvalues and diagonalization set.",
    subtasks: [],
    suggestions: [
      {
        id: "g1",
        label: "Aug 27, 7:00–8:30 PM",
        rationale: "Placed right after your MATH tutoring hour so the material is still fresh.",
      },
    ],
  },
  {
    id: "t6",
    title: "Renew library books",
    course: "life",
    due: "2026-08-29",
    dueLabel: "Due Aug 29",
    bucket: "later",
    effortHours: 0.25,
    status: "todo",
    source: "manual",
    description: "Three books out on the HIST reserve shelf.",
    subtasks: [],
    suggestions: [],
  },
];

export type EventKind = "class" | "fixed" | "study" | "suggested";

export type CalendarEvent = {
  id: string;
  title: string;
  course: CourseId;
  day: number; // 0 = Monday
  start: number; // hours, 24h decimal
  end: number;
  kind: EventKind;
  rationale: string;
  notes?: string;
  source?: "manual" | "google";
};

export const events: CalendarEvent[] = [
  { id: "e1", title: "CS 250 Lecture", course: "cs", day: 0, start: 9, end: 10.25, kind: "class", rationale: "Imported from your Google Calendar." },
  { id: "e2", title: "BIO 110 Lab", course: "bio", day: 0, start: 13, end: 15, kind: "class", rationale: "Imported from your Google Calendar." },
  { id: "e3", title: "Shift at campus café", course: "life", day: 0, start: 17, end: 20, kind: "fixed", rationale: "Recurring commitment you added during onboarding." },
  { id: "e4", title: "Read HIST Ch. 7", course: "hist", day: 1, start: 10, end: 11, kind: "study", rationale: "You approved this block yesterday." },
  { id: "e5", title: "ECON 201 Lecture", course: "econ", day: 1, start: 11.5, end: 12.75, kind: "class", rationale: "Imported from your Google Calendar." },
  { id: "e6", title: "PS4 deep work", course: "cs", day: 1, start: 16, end: 17.5, kind: "suggested", rationale: "Your last free block before the 11:59 PM deadline, and you rated mid-afternoon as your sharpest window." },
  { id: "e7", title: "Enzyme lab write-up", course: "bio", day: 2, start: 11, end: 12.5, kind: "suggested", rationale: "No classes Wednesday morning — graphing goes faster when you're rested." },
  { id: "e8", title: "CS 250 Lecture", course: "cs", day: 2, start: 9, end: 10.25, kind: "class", rationale: "Imported from your Google Calendar." },
  { id: "e9", title: "MATH 221 Tutoring", course: "math", day: 2, start: 15, end: 16, kind: "fixed", rationale: "Weekly commitment from onboarding." },
  { id: "e10", title: "ECON midterm review", course: "econ", day: 3, start: 14, end: 15.5, kind: "suggested", rationale: "First of four spaced sessions before Wednesday's exam — spacing beats cramming." },
  { id: "e11", title: "Intramural soccer", course: "life", day: 3, start: 18, end: 19.5, kind: "fixed", rationale: "You marked evenings after 6 on Thursday as protected." },
  { id: "e12", title: "HIST discussion post", course: "hist", day: 4, start: 10, end: 11, kind: "suggested", rationale: "Placed after both reading blocks so you can write with the chapters fresh." },
  { id: "e13", title: "ECON practice exam A", course: "econ", day: 4, start: 13, end: 14.5, kind: "suggested", rationale: "Timed practice fits your longest uninterrupted Friday gap." },
  { id: "e14", title: "MATH WebAssign #6", course: "math", day: 5, start: 11, end: 12.5, kind: "suggested", rationale: "Weekend morning slot — you said Saturdays start slow but stay open." },
  { id: "e15", title: "ECON midterm review", course: "econ", day: 6, start: 15, end: 16.5, kind: "suggested", rationale: "Final spaced session, one day before the exam." },
];

export const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function formatHour(h: number) {
  const hour = Math.floor(h);
  const mins = Math.round((h - hour) * 60);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}${mins ? `:${String(mins).padStart(2, "0")}` : ""} ${suffix}`;
}
