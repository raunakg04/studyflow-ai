-- Tempo consolidated schema (generated from supabase/migrations, in order).
-- Apply to a fresh Supabase project via the SQL editor, or prefer: supabase link && supabase db push

-- ===== 20260822111836_23e8cc40-9538-4440-82f9-255c20be4c1f.sql =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  school TEXT NOT NULL DEFAULT '',
  rhythm TEXT NOT NULL DEFAULT '',
  availability JSONB NOT NULL DEFAULT '[]'::jsonb,
  focus_minutes INTEGER NOT NULL DEFAULT 50,
  break_minutes INTEGER NOT NULL DEFAULT 10,
  commitments JSONB NOT NULL DEFAULT '[]'::jsonb,
  connected JSONB NOT NULL DEFAULT '{"google":false,"canvas":false}'::jsonb,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ===== 20260822111853_7a1b47ab-19de-4f86-95ed-7aec23a44b4f.sql =====
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
-- ===== 20260822113542_2a3efa1a-5bc0-407a-9795-3ffbfe630357.sql =====
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  course text NOT NULL DEFAULT 'life',
  due date,
  due_label text NOT NULL DEFAULT '',
  bucket text NOT NULL DEFAULT 'later',
  effort_hours numeric NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'todo',
  source text NOT NULL DEFAULT 'manual',
  description text NOT NULL DEFAULT '',
  subtasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tasks" ON public.tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.calendar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  course text NOT NULL DEFAULT 'life',
  day smallint NOT NULL DEFAULT 0,
  start_hour numeric NOT NULL DEFAULT 9,
  end_hour numeric NOT NULL DEFAULT 10,
  kind text NOT NULL DEFAULT 'study',
  rationale text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own calendar events" ON public.calendar_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER calendar_events_set_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- ===== 20260824171203_a549eba0-9254-44de-a1c4-a3b637094715.sql =====
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
