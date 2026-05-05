-- Update nearby_flyers: change default radius to 25 km and add zone_name + distance_m.
-- Drops the old SETOF flyers function and recreates with TABLE return type.
DROP FUNCTION IF EXISTS nearby_flyers(double precision, double precision, double precision);

CREATE FUNCTION nearby_flyers(
  user_lat   double precision,
  user_lng   double precision,
  radius_km  double precision DEFAULT 25.0
)
RETURNS TABLE (
  id             uuid,
  created_at     timestamptz,
  image_url      text,
  status         text,
  title          text,
  address        text,
  location       geography,
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
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS distance_m
  FROM public.flyers f
  WHERE f.status = 'approved'
    AND f.location IS NOT NULL
    AND (f.expires_at IS NULL OR f.expires_at > now())
    AND ST_DWithin(
      f.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_m ASC
  LIMIT 500;
$$;
