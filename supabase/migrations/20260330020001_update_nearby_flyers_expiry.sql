-- Update nearby_flyers to filter out expired flyers
CREATE OR REPLACE FUNCTION nearby_flyers(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision DEFAULT 50.0
)
RETURNS SETOF flyers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT *
  FROM flyers
  WHERE status = 'approved'
    AND location IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now())
    AND ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY ST_Distance(
    location,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
  )
  LIMIT 500;
$$;
