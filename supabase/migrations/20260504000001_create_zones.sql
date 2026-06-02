-- Zones table for Monterrey metro area
-- Used to display short zone names (MTY, SAN PEDRO, APODACA, etc.)
CREATE TABLE IF NOT EXISTS public.zones (
  id       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name     TEXT    NOT NULL,
  geom     extensions.geometry(POLYGON, 4326) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS zones_geom_idx ON public.zones USING GIST (geom);
CREATE INDEX IF NOT EXISTS zones_priority_idx ON public.zones (priority DESC);

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read zones"
  ON public.zones FOR SELECT
  TO anon, authenticated
  USING (true);

-- Seed: 7 Monterrey metro zones (approximate polygons, lon lat order)
INSERT INTO public.zones (name, priority, geom) VALUES
  ('MTY', 10, extensions.ST_GeomFromText('POLYGON((-100.37 25.62, -100.28 25.62, -100.28 25.70, -100.37 25.70, -100.37 25.62))', 4326)),
  ('SAN PEDRO', 9, extensions.ST_GeomFromText('POLYGON((-100.44 25.61, -100.37 25.61, -100.37 25.69, -100.44 25.69, -100.44 25.61))', 4326)),
  ('GUADALUPE', 8, extensions.ST_GeomFromText('POLYGON((-100.28 25.63, -100.20 25.63, -100.20 25.72, -100.28 25.72, -100.28 25.63))', 4326)),
  ('APODACA', 7, extensions.ST_GeomFromText('POLYGON((-100.23 25.75, -100.13 25.75, -100.13 25.84, -100.23 25.84, -100.23 25.75))', 4326)),
  ('ESCOBEDO', 6, extensions.ST_GeomFromText('POLYGON((-100.37 25.75, -100.29 25.75, -100.29 25.83, -100.37 25.83, -100.37 25.75))', 4326)),
  ('SANTA CATARINA', 5, extensions.ST_GeomFromText('POLYGON((-100.48 25.64, -100.40 25.64, -100.40 25.71, -100.48 25.71, -100.48 25.64))', 4326)),
  ('JUÁREZ', 4, extensions.ST_GeomFromText('POLYGON((-100.12 25.62, -100.01 25.62, -100.01 25.73, -100.12 25.73, -100.12 25.62))', 4326));
