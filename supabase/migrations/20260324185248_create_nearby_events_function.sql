CREATE OR REPLACE FUNCTION public.get_nearby_events(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 25000,
  category_filter TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 20,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  category_id UUID,
  title TEXT,
  description TEXT,
  flyer_url TEXT,
  venue_name TEXT,
  venue_address TEXT,
  location TEXT,
  date DATE,
  time_start TIME,
  time_end TIME,
  price NUMERIC,
  currency TEXT,
  external_url TEXT,
  status TEXT,
  views_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  category_name TEXT,
  category_slug TEXT,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id, e.user_id, e.category_id, e.title, e.description,
    e.flyer_url, e.venue_name, e.venue_address,
    ST_AsText(e.location)::TEXT AS location,
    e.date, e.time_start, e.time_end, e.price, e.currency,
    e.external_url, e.status, e.views_count,
    e.created_at, e.updated_at,
    c.name AS category_name,
    c.slug AS category_slug,
    ST_Distance(
      e.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS distance_meters
  FROM public.events e
  JOIN public.categories c ON c.id = e.category_id
  WHERE e.status = 'active'
    AND e.date >= CURRENT_DATE
    AND ST_DWithin(
      e.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_meters
    )
    AND (category_filter IS NULL OR c.slug = category_filter)
  ORDER BY distance_meters ASC, e.date ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql STABLE;
