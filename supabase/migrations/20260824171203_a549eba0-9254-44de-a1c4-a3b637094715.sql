-- 1. Profile timezone
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';

-- 2. Scheduling preferences (one row per user)
CREATE TABLE public.scheduling_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  study_window_start time NOT NULL DEFAULT '09:00',
  study_window_end time NOT NULL DEFAULT '21:00',
  max_daily_study_minutes integer NOT NULL DEFAULT 240,
  focus_minutes integer NOT NULL DEFAULT 50,
  break_minutes integer NOT NULL DEFAULT 10,
  buffer_minutes integer NOT NULL DEFAULT 10,
  available_days smallint[] NOT NULL DEFAULT '{1,2,3,4,5}',
  allow_weekends boolean NOT NULL DEFAULT false,
  planning_horizon_days integer NOT NULL DEFAULT 14,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduling_preferences TO authenticated;
GRANT ALL ON public.scheduling_preferences TO service_role;
ALTER TABLE public.scheduling_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own scheduling preferences"
  ON public.scheduling_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER scheduling_preferences_set_updated_at
  BEFORE UPDATE ON public.scheduling_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. UTC timestamps + import metadata on existing entities
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS all_day boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_user_source_external_idx
  ON public.calendar_events (user_id, source, external_id)
  WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS calendar_events_user_starts_at_idx
  ON public.calendar_events (user_id, starts_at);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS estimated_minutes integer,
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_source_external_idx
  ON public.tasks (user_id, source, external_id)
  WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_user_due_at_idx ON public.tasks (user_id, due_at);

-- 4. Schedule blocks
CREATE TABLE public.schedule_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  title text NOT NULL,
  course text NOT NULL DEFAULT 'life',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'suggested',
  origin text NOT NULL DEFAULT 'ai',
  user_modified boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  actual_minutes integer,
  rationale text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedule_blocks_time_order CHECK (ends_at > starts_at),
  CONSTRAINT schedule_blocks_status_check CHECK (status IN ('suggested','approved','rejected','completed','skipped')),
  CONSTRAINT schedule_blocks_origin_check CHECK (origin IN ('ai','manual'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_blocks TO authenticated;
GRANT ALL ON public.schedule_blocks TO service_role;
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own schedule blocks"
  ON public.schedule_blocks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER schedule_blocks_set_updated_at
  BEFORE UPDATE ON public.schedule_blocks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX schedule_blocks_user_starts_at_idx ON public.schedule_blocks (user_id, starts_at);
CREATE INDEX schedule_blocks_task_id_idx ON public.schedule_blocks (task_id);

-- 5. Integrations
CREATE TABLE public.integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  account_label text NOT NULL DEFAULT '',
  last_synced_at timestamptz,
  last_sync_error text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integrations_provider_check CHECK (provider IN ('google_calendar','canvas')),
  CONSTRAINT integrations_status_check CHECK (status IN ('connected','disconnected','error')),
  CONSTRAINT integrations_user_provider_unique UNIQUE (user_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT ALL ON public.integrations TO service_role;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own integrations"
  ON public.integrations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER integrations_set_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();