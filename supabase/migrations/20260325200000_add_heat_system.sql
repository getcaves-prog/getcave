-- Add heat_count to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS heat_count integer DEFAULT 0;

-- Create event_heat table for tracking who heated what
CREATE TABLE IF NOT EXISTS public.event_heat (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT event_heat_unique UNIQUE (event_id, user_id),
  CONSTRAINT event_heat_session_unique UNIQUE (event_id, session_id)
);

-- Enable RLS
ALTER TABLE public.event_heat ENABLE ROW LEVEL SECURITY;

-- Policies: anyone can read heat, authenticated users can insert/delete their own
CREATE POLICY "Anyone can view heat" ON public.event_heat
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can heat" ON public.event_heat
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unheat their own" ON public.event_heat
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_event_heat_event_id ON public.event_heat(event_id);
CREATE INDEX IF NOT EXISTS idx_event_heat_user_id ON public.event_heat(user_id);

-- Function to toggle heat
CREATE OR REPLACE FUNCTION public.toggle_event_heat(p_event_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_exists boolean;
  v_new_count integer;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.event_heat
    WHERE event_id = p_event_id AND user_id = v_user_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.event_heat WHERE event_id = p_event_id AND user_id = v_user_id;
    UPDATE public.events SET heat_count = GREATEST(heat_count - 1, 0) WHERE id = p_event_id
    RETURNING heat_count INTO v_new_count;
    RETURN json_build_object('heated', false, 'heat_count', v_new_count);
  ELSE
    INSERT INTO public.event_heat (event_id, user_id) VALUES (p_event_id, v_user_id);
    UPDATE public.events SET heat_count = heat_count + 1 WHERE id = p_event_id
    RETURNING heat_count INTO v_new_count;
    RETURN json_build_object('heated', true, 'heat_count', v_new_count);
  END IF;
END;
$$;
