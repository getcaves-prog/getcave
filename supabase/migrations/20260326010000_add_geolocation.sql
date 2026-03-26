-- Make PostGIS types available without schema prefix
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;
SET search_path TO public, extensions;

-- Add geolocation columns to flyers
ALTER TABLE flyers ADD COLUMN IF NOT EXISTS location extensions.geography(POINT, 4326);
ALTER TABLE flyers ADD COLUMN IF NOT EXISTS address text;

-- Spatial index for proximity queries
CREATE INDEX IF NOT EXISTS idx_flyers_location ON flyers USING GIST (location);

-- Add moderation status
ALTER TABLE flyers ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));
CREATE INDEX IF NOT EXISTS idx_flyers_status ON flyers (status);

-- Update all existing flyers with random Monterrey locations
-- Monterrey metro area: lat 25.5-25.8, lng -100.1 to -100.5
UPDATE flyers SET
  location = extensions.ST_SetSRID(extensions.ST_MakePoint(
    -100.3161 + (random() - 0.5) * 0.3,
    25.6866 + (random() - 0.5) * 0.2
  ), 4326)::extensions.geography,
  address = 'Monterrey, Nuevo León, México'
WHERE location IS NULL;
