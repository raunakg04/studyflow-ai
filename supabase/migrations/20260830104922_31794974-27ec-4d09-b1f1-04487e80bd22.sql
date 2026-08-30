CREATE TABLE IF NOT EXISTS public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_id text NOT NULL,
  connection_key_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS integrations_user_provider_key
  ON public.integrations (user_id, provider);

CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_user_external_key
  ON public.calendar_events (user_id, source, external_id)
  WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_external_key
  ON public.tasks (user_id, source, external_id)
  WHERE external_id IS NOT NULL;