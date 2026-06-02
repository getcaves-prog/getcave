-- Returns the short zone name for a given lat/lng coordinate.
-- Returns NULL if the point falls outside all known zones.
CREATE OR REPLACE FUNCTION get_zone_name(
  lat double precision,
  lng double precision
)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT name
  FROM public.zones
  WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  ORDER BY priority DESC
  LIMIT 1;
$$;
