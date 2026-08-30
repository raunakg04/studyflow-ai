CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_user_source_external_idx
  ON public.calendar_events (user_id, source, external_id)
  WHERE external_id IS NOT NULL;