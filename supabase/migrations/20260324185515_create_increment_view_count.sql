CREATE OR REPLACE FUNCTION public.increment_view_count(event_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.events
  SET views_count = views_count + 1
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
