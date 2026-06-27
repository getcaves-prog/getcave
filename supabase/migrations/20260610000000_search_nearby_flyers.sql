-- search_nearby_flyers: location-aware text search over approved, non-expired flyers.
-- Mirrors nearby_flyers' return shape (incl. zone_name + distance_m) but adds a
-- case-insensitive title/description text match. When p_query is empty/null it
-- behaves like nearby_flyers (pure location filter).
DROP FUNCTION IF EXISTS search_nearby_flyers(text, double precision, double precision, integer, integer);

CREATE FUNCTION search_nearby_flyers(
  p_query     text,
  p_lat       double precision,
  p_lng       double precision,
  p_radius_km integer DEFAULT 25,
  p_limit     integer DEFAULT 100
)
RETURNS TABLE (
  id             uuid,
  created_at     timestamptz,
  image_url      text,
  status         text,
  title          text,
  address        text,
  location       extensions.geography,
  canvas_x       integer,
  canvas_y       integer,
  rotation       numeric,
  width          integer,
  height         integer,
  duration_days  integer,
  expires_at     timestamptz,
  user_id        uuid,
  is_promoted    boolean,
  promoted_until timestamptz,
  description    text,
  social_copy    text,
  event_date     date,
  event_time     time,
  zone_name      text,
  distance_m     float8
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    f.id,
    f.created_at,
    f.image_url,
    f.status,
    f.title,
    f.address,
    f.location::geography,
    f.canvas_x,
    f.canvas_y,
    f.rotation,
    f.width,
    f.height,
    f.duration_days,
    f.expires_at,
    f.user_id,
    f.is_promoted,
    f.promoted_until,
    f.description,
    f.social_copy,
    f.event_date,
    f.event_time,
    get_zone_name(
      ST_Y(f.location::geometry),
      ST_X(f.location::geometry)
    ) AS zone_name,
    ST_Distance(
      f.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_m
  FROM public.flyers f
  WHERE f.status = 'approved'
    AND f.location IS NOT NULL
    AND (f.expires_at IS NULL OR f.expires_at > now())
    AND ST_DWithin(
      f.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000
    )
    AND (
      p_query IS NULL
      OR btrim(p_query) = ''
      OR f.title ILIKE '%' || p_query || '%'
      OR f.description ILIKE '%' || p_query || '%'
    )
  ORDER BY distance_m ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION search_nearby_flyers(text, double precision, double precision, integer, integer) TO anon, authenticated;
