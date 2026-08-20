# StudyFlow — AI study planner (UI shell)

Build the front-end structure for a student task and schedule assistant: onboarding, tasks, and calendar. No backend, no real AI or Canvas/Google Calendar syncing yet — realistic placeholder data and non-functional-but-believable connect buttons.

## Pages

**Onboarding (`/onboarding`)** — multi-step card, one question per step, progress bar, back/next.
1. Name + school
2. Study rhythm (morning / afternoon / night owl) — visual picker
3. Typical daily availability (start & end time, days off)
4. Focus block length + break preference (slider)
5. Commitments (work, sports, clubs) — chip input
6. Connect accounts: Google Calendar + Canvas cards with Connect buttons (stubbed, show "Coming soon" state)
7. Summary — "Generate my schedule" → routes to calendar

**Tasks (`/tasks`)** — list of task entries grouped by Today / This week / Later.
- Task row: color-coded course dot, title, course, due date chip, estimated effort, status.
- Filter bar (course, status), search field, "Add task" sheet with form fields.
- Right-side panel or drawer on click: description, subtasks, AI-suggested study blocks with Approve / Adjust / Dismiss buttons.

**Calendar (`/calendar`)** — week view by default with day toggle.
- Time grid, hour lines, current-time indicator.
- Task bubbles: rounded blocks colored per course; fixed events (class, work) styled solid, AI-suggested study blocks styled dashed/translucent with a small sparkle icon.
- Bubbles draggable-looking; clicking opens a popover with Approve / Reschedule / Delete.
- Top bar: week nav, "Re-generate with AI" button, legend.

**Home (`/`)** — landing that routes into onboarding, plus a quick "today at a glance" preview once onboarded (local state only).

## Shared shell
Persistent bottom nav on mobile / left rail on desktop: Today, Tasks, Calendar, Settings. Header with greeting and an AI assistant button that opens a chat-style side panel (UI only, canned messages).

## Design direction
Clean, soft, low-clutter: rounded geometric type (Outfit headings / Figtree body), generous whitespace, large radii (16–24px), soft shadows instead of hard borders, calm off-white base with a single deep-teal accent and muted per-course pastel colors. Dark mode supported. Motion is subtle — fades and slides only.

## Technical notes
- TanStack Start file routes: `index.tsx`, `onboarding.tsx`, `tasks.tsx`, `calendar.tsx`, `settings.tsx`, each with its own `head()` metadata.
- Design tokens added to `src/styles.css` (`@theme inline`); fonts loaded via `<link>` in `__root.tsx`. No hardcoded color utilities.
- Shared layout chrome in `__root.tsx`; shadcn components for form controls, sheet, dialog, popover.
- Mock data in `src/lib/mock-data.ts`; onboarding answers and task state held in React state/localStorage so the flow feels live.
- Mobile-first (390px) layouts, scaling up to desktop.

## Out of scope for now
Auth, database, real Google Calendar / Canvas integration, real AI generation, kanban board.
