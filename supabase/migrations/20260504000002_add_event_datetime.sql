-- Add optional event date/time to flyers
ALTER TABLE public.flyers
  ADD COLUMN IF NOT EXISTS event_date DATE,
  ADD COLUMN IF NOT EXISTS event_time TIME;

-- Partial index for approved flyers with a date set
CREATE INDEX IF NOT EXISTS flyers_event_date_approved_idx
  ON public.flyers (event_date)
  WHERE status = 'approved' AND event_date IS NOT NULL;
