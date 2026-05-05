-- Scored feed RPC: weighted ranking by distance (0.5) + time (0.3) + interaction (0.2).
-- Does NOT replace nearby_flyers — runs alongside it behind a feature flag.
CREATE OR REPLACE FUNCTION nearby_flyers_scored(
  user_lat  double precision,
  user_lng  double precision,
  radius_km double precision DEFAULT 25.0,
  result_limit integer DEFAULT 200
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
  distance_m     float8,
  distance_score float8,
  time_score     float8,
  interaction_score float8,
  total_score    float8
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH base AS (
    SELECT
      f.*,
      get_zone_name(ST_Y(f.location::geometry), ST_X(f.location::geometry)) AS zone_name,
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
  ),
  interactions AS (
    SELECT
      b.id,
      -- Views in last 7 days
      COALESCE((
        SELECT COUNT(*) FROM public.flyer_views fv
        WHERE fv.flyer_id = b.id
          AND fv.viewed_at >= now() - interval '7 days'
      ), 0) AS views_7d,
      -- Saves in last 14 days
      COALESCE((
        SELECT COUNT(*) FROM public.saved_flyers sf
        WHERE sf.flyer_id = b.id
          AND sf.created_at >= now() - interval '14 days'
      ), 0) AS saves_14d
    FROM base b
  ),
  scored AS (
    SELECT
      b.*,
      -- Distance score: 1.0 at 0m, 0.0 at radius boundary
      GREATEST(0.0, 1.0 - (b.distance_m / (radius_km * 1000))) AS distance_score,
      -- Time score: HOY=1.0, MAÑANA=0.7, next 3 days=0.4, no date=0.2
      CASE
        WHEN b.event_date = CURRENT_DATE THEN 1.0
        WHEN b.event_date = CURRENT_DATE + 1 THEN 0.7
        WHEN b.event_date BETWEEN CURRENT_DATE + 2 AND CURRENT_DATE + 4 THEN 0.4
        ELSE 0.2
      END AS time_score,
      -- Interaction score: normalized (views*1 + saves*3, capped at 100)
      LEAST(1.0, (i.views_7d + i.saves_14d * 3)::float8 / 100.0) AS interaction_score
    FROM base b
    JOIN interactions i ON i.id = b.id
  )
  SELECT
    s.id, s.created_at, s.image_url, s.status, s.title, s.address,
    s.location::geography, s.canvas_x, s.canvas_y, s.rotation,
    s.width, s.height, s.duration_days, s.expires_at, s.user_id,
    s.is_promoted, s.promoted_until, s.description, s.social_copy,
    s.event_date, s.event_time, s.zone_name, s.distance_m,
    s.distance_score,
    s.time_score,
    s.interaction_score,
    (s.distance_score * 0.5 + s.time_score * 0.3 + s.interaction_score * 0.2) AS total_score
  FROM scored s
  ORDER BY total_score DESC
  LIMIT result_limit;
$$;
