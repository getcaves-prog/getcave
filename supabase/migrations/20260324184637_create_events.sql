CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  title TEXT NOT NULL,
  description TEXT,
  flyer_url TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  location extensions.geography(Point, 4326) NOT NULL,
  date DATE NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME,
  price NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'MXN',
  external_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'cancelled', 'past')),
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active events readable" ON public.events FOR SELECT USING (status = 'active');
CREATE POLICY "Users read own events" ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own events" ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own events" ON public.events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own events" ON public.events FOR DELETE USING (auth.uid() = user_id);
